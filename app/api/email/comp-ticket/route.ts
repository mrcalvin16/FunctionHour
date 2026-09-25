import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!user || !email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { compTicketId } = await request.json();
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;

    if (!compTicketId || !serverSecret) {
      return NextResponse.json(
        { error: "Ticket email is not configured." },
        { status: 500 },
      );
    }

    const delivery = await getConvexClient().query(
      api.compTickets.getDeliveryDetails,
      {
        serverSecret,
        clerkId: user.id,
        email,
        compTicketId: compTicketId as Id<"compTickets">,
      },
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const ticketUrl = new URL(
      `/tickets/${delivery.ticketId}`,
      appUrl,
    ).toString();
    const recipientName = escapeEmailHtml(delivery.recipientName);
    const eventName = escapeEmailHtml(delivery.eventName);
    const ticketType = escapeEmailHtml(delivery.ticketTypeName);
    const venue = escapeEmailHtml(delivery.venue);

    await sendTransactionalEmail({
      to: delivery.recipientEmail,
      subject: `Your ticket for ${delivery.eventName}`,
      idempotencyKey: `comp-ticket-${delivery.compTicketId}-${delivery.lastSentAt}`,
      text: `Hi ${delivery.recipientName},\n\nYou received ${delivery.quantity} ${delivery.ticketTypeName} ticket(s) for ${delivery.eventName}.\n${delivery.venue}\n\nOpen your ticket: ${ticketUrl}\n\nSign in with ${delivery.recipientEmail} to access the pass.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;color:#7c3aed">FUNCTION HOUR</p><h1 style="font-size:30px;line-height:1.15">Your ticket is ready</h1><p>Hi ${recipientName},</p><p>You received <strong>${delivery.quantity} ${ticketType} ticket(s)</strong> for <strong>${eventName}</strong>.</p><p>${venue}</p><p style="margin:28px 0"><a href="${ticketUrl}" style="background:#7c3aed;color:white;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700">Open your ticket</a></p><p style="font-size:13px;color:#666">Sign in using ${escapeEmailHtml(delivery.recipientEmail)} to access the pass. Questions? Reply to this email.</p></div>`,
    });

    return NextResponse.json({ delivered: true });
  } catch (error) {
    console.error("Comp ticket email error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          error.message === "Transactional email is not configured."
            ? error.message
            : "Unable to deliver the ticket email.",
      },
      { status: 500 },
    );
  }
}
