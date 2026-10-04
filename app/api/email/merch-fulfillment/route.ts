import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!serverSecret) return NextResponse.json({ error: "Fulfillment email is not configured." }, { status: 500 });

    const body = await request.json() as { orderId?: string; expectedUpdatedAt?: number };
    if (!body.orderId || !Number.isFinite(body.expectedUpdatedAt))
      return NextResponse.json({ error: "Order and fulfillment update are required." }, { status: 400 });

    const details = await getConvexClient().query(api.merch.getFulfillmentEmailDetails, {
      serverSecret,
      clerkId: user.id,
      orderId: body.orderId as Id<"merchOrders">,
      expectedUpdatedAt: body.expectedUpdatedAt!,
    });
    if (!details) return NextResponse.json({ sent: false });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const ordersUrl = new URL("/my-merch-orders", appUrl).toString();
    const shipped = details.status === "shipped";
    const subject = shipped ? `Your order from ${details.eventName} is on its way` : `Your order from ${details.eventName} is ready for pickup`;
    const itemSummary = details.items.map((item) => `${item.quantity} × ${item.name}${item.variantName ? ` — ${item.variantName}` : ""}`).join(", ");
    const trackingUrl = safeTrackingUrl(details.trackingUrl);
    const safeEventName = escapeEmailHtml(details.eventName);
    const safeItemSummary = escapeEmailHtml(itemSummary);
    const trackingLink = trackingUrl ? `<p><a href="${escapeEmailHtml(trackingUrl)}" style="color:#6d28d9;font-weight:700">Track your shipment</a></p>` : "";
    const trackingText = trackingUrl ? `\nTrack your shipment: ${trackingUrl}` : details.trackingNumber ? `\nTracking number: ${details.trackingNumber}` : "";
    const statusMessage = shipped
      ? "Your order has shipped."
      : "Your order is ready for pickup. Check the event page or contact the organizer for pickup arrangements.";

    await sendTransactionalEmail({
      to: details.buyerEmail,
      subject,
      idempotencyKey: `merch-fulfillment-${details.orderId}-${details.status}-${details.updatedAt}`,
      text: `Hi ${details.buyerName || "there"},\n\n${statusMessage}\nItems: ${itemSummary}\nEvent: ${details.eventName}${trackingText}\n\nView your order: ${ordersUrl}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;color:#7c3aed">FUNCTION HOUR</p><h1 style="font-size:28px;line-height:1.2">${shipped ? "Your order is on its way" : "Your order is ready for pickup"}</h1><p>${escapeEmailHtml(statusMessage)}</p><p><strong>${safeItemSummary}</strong><br>${safeEventName}</p>${trackingLink}<p style="margin:28px 0"><a href="${ordersUrl}" style="background:#7c3aed;color:white;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">View My Merch Orders</a></p><p style="font-size:13px;color:#666">Tracking and order status are also available in your Function Hour account.</p></div>`,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Merch fulfillment email error:", error);
    return NextResponse.json({
      error: error instanceof Error && error.message === "Transactional email is not configured."
        ? error.message
        : "Unable to deliver the fulfillment email.",
    }, { status: 500 });
  }
}

function safeTrackingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}
