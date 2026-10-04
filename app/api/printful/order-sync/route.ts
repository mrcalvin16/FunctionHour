import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { getPrintfulOrderStatus } from "@/lib/printful/server";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!serverSecret) throw new Error("Server secret is missing.");
    const { orderId } = (await request.json()) as { orderId?: string };
    if (!orderId) return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    const typedOrderId = orderId as Id<"merchOrders">;
    const convex = getConvexClient();
    const record = await convex.query(api.merch.getPrintfulSyncRecord, { serverSecret, orderId: typedOrderId, clerkId: user.id });
    if (!record) return NextResponse.json({ error: "Printful order not found." }, { status: 404 });
    const status = await getPrintfulOrderStatus(record.printfulOrderId);
    const update = await convex.mutation(api.merch.recordPrintfulShipment, { serverSecret, orderId: typedOrderId, clerkId: user.id, printfulStatus: status.status, trackingNumber: status.trackingNumber, trackingUrl: status.trackingUrl, shipped: status.shipped });
    if (update.notifyCustomer) {
      const details = await convex.query(api.merch.getFulfillmentEmailDetails, {
        serverSecret,
        clerkId: user.id,
        orderId: typedOrderId,
        expectedUpdatedAt: update.updatedAt,
      });
      if (details) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const ordersUrl = new URL("/my-merch-orders", appUrl).toString();
        const trackingUrl = safeTrackingUrl(details.trackingUrl);
        const eventName = escapeEmailHtml(details.eventName);
        const trackingLink = trackingUrl ? `<p><a href="${escapeEmailHtml(trackingUrl)}" style="color:#6d28d9;font-weight:700">Track your shipment</a></p>` : "";
        try {
          await sendTransactionalEmail({
            to: details.buyerEmail,
            subject: `Your order from ${details.eventName} is on its way`,
            idempotencyKey: `merch-fulfillment-${details.orderId}-${details.status}-${details.updatedAt}`,
            text: `Your order has shipped.\nTracking number: ${details.trackingNumber || "Not provided"}\n\nView your order: ${ordersUrl}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;color:#7c3aed">FUNCTION HOUR</p><h1 style="font-size:28px">Your order is on its way</h1><p>Your order from <strong>${eventName}</strong> has shipped.</p>${trackingLink}<p style="margin:28px 0"><a href="${ordersUrl}" style="background:#7c3aed;color:white;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">View My Merch Orders</a></p></div>`,
          });
        } catch (emailError) {
          console.error("Printful shipment email delivery failed:", emailError);
        }
      }
    }
    return NextResponse.json({ ...status, customerNotified: update.notifyCustomer });
  } catch (error) {
    console.error("Printful order sync error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sync Printful status." }, { status: 500 });
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
