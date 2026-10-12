import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";
import { checkRateLimit, getClientKey } from "@/lib/supportRateLimit";

export const dynamic = "force-dynamic";

const input = z.object({
  organizerUserId: z.string().trim().min(3).max(128),
  eventId: z.string().trim().min(1).max(100).optional(),
  reason: z.enum(["ticket", "event", "other"]),
  message: z.string().trim().min(10).max(2000),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  const origin = request.headers.get("origin");
  if (origin !== requestOrigin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 6000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 413 });
  }

  const sender = await currentUser();
  const senderEmail = sender?.primaryEmailAddress?.emailAddress;
  if (!sender || !senderEmail || sender.primaryEmailAddress?.verification?.status !== "verified") {
    return NextResponse.json({ error: "Sign in with a verified email to contact this organizer." }, { status: 401 });
  }

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a reason and write a message of at least 10 characters." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ sent: true });
  const { organizerUserId, eventId, reason, message } = parsed.data;
  if (sender.id === organizerUserId) {
    return NextResponse.json({ error: "You cannot message your own organizer profile." }, { status: 400 });
  }

  try {
    const limit = await checkRateLimit("organizer-contact", getClientKey(request, sender.id), {
      limit: 3, windowMs: 3_600_000,
    });
    if (!limit.allowed) return NextResponse.json({ error: "Too many messages. Please try again later." }, {
      status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });

    const convex = getConvexClient();
    const profile = await convex.query(api.organizers.getOrganizerByUserId, { userId: organizerUserId });
    const history = profile as (typeof profile & { pastEvents?: unknown[] }) | null;
    if (!profile?.organizer ||
        (!profile.events.length && !history?.pastEvents?.length && !profile.organizer.organizerName?.trim())) {
      return NextResponse.json({ error: "Organizer unavailable." }, { status: 404 });
    }
    let eventName: string | undefined;
    if (eventId) {
      const event = await convex.query(api.events.getById, { eventId: eventId as Id<"events"> });
      if (!event || (event.userId !== organizerUserId && event.organizerId !== organizerUserId)) {
        return NextResponse.json({ error: "Event does not belong to this organizer." }, { status: 400 });
      }
      eventName = event.name;
    }

    const recipient = await (await clerkClient()).users.getUser(organizerUserId);
    const recipientEmail = recipient.emailAddresses.find(
      (email) => email.id === recipient.primaryEmailAddressId && email.verification?.status === "verified",
    )?.emailAddress;
    if (!recipientEmail) return NextResponse.json({ error: "This organizer cannot receive messages right now." }, { status: 503 });

    const senderName = (sender.fullName || sender.username || "Function Hour attendee").slice(0, 100);
    const reasonLabel = reason === "ticket" ? "Ticket question" : reason === "event" ? "Event question" : "Other question";
    const context = eventId ? `https://functionhour.com/events/${eventId}` : `https://functionhour.com/organizers/${organizerUserId}`;
    await sendTransactionalEmail({
      to: recipientEmail,
      replyTo: senderEmail,
      subject: `Function Hour: ${reasonLabel}${eventName ? ` for ${eventName}` : ""}`.slice(0, 180),
      text: `New message from ${senderName} <${senderEmail}>\nReason: ${reasonLabel}\n${eventName ? `Event: ${eventName}\n` : ""}Page: ${context}\n\n${message}\n\nReply to this email to respond. Never request payment details by email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171717"><h1>Message from an attendee</h1><p>${escapeEmailHtml(senderName)} &lt;${escapeEmailHtml(senderEmail)}&gt;</p><p><strong>Reason:</strong> ${escapeEmailHtml(reasonLabel)}</p>${eventName ? `<p><strong>Event:</strong> ${escapeEmailHtml(eventName)}</p>` : ""}<p style="white-space:pre-wrap">${escapeEmailHtml(message)}</p><p><a href="${escapeEmailHtml(context)}">View on Function Hour</a></p><p>Reply to this email to respond. Never request payment details by email.</p></div>`,
    });
    return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[organizer.contact] Delivery failed", { organizerUserId, eventId, error });
    return NextResponse.json({ error: "Message could not be sent. Please try again or contact operations@functionhour.com." }, { status: 503 });
  }
}
