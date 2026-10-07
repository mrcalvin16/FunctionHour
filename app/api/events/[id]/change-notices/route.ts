import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  if (origin !== requestOrigin && origin !== appOrigin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const input = await request.json().catch(() => null);
  if (!input || typeof input.changeId !== "string") return NextResponse.json({ error: "Missing event change." }, { status: 400 });
  const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!serverSecret) return NextResponse.json({ error: "Notices are not configured." }, { status: 503 });
  try {
    const convex = getConvexClient();
    const access = await convex.query(api.events.verifyOrganizerEventForServer, {
      serverSecret, eventId: id as Id<"events">, clerkId: user.id,
    });
    if (!access) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    const { change, eventName, eventId, notices } = await convex.query(api.eventOperations.getPendingNotices, {
      serverSecret, changeId: input.changeId as Id<"eventChanges">,
    });
    if (eventId !== id) return NextResponse.json({ error: "Change belongs to another event." }, { status: 403 });
    if (!change.queueComplete) return NextResponse.json({ error: "Preparing recipient list. Try again shortly." }, { status: 409 });
    const eventUrl = new URL(`/events/${id}`, process.env.NEXT_PUBLIC_APP_URL || requestOrigin).toString();
    let sent = 0;
    for (const notice of notices) {
      const subject = `Update about ${eventName}`.replace(/[\r\n]/g, " ");
      const detail = change.kind === "cancelled" ? "This event has been cancelled." :
        change.kind === "postponed" ? "This event has been postponed. A new date has not been confirmed." :
        change.kind === "rescheduled" ? `The event has a new date: ${new Date(change.nextDate!).toUTCString()} (UTC).` :
        `The venue has changed to ${change.nextVenue}.`;
      try {
        await sendTransactionalEmail({
          to: notice.email, subject,
          idempotencyKey: `event-change-${change._id}-${notice._id}`,
          text: `${eventName}\n\n${detail}\n\n${change.message}\n\nSee the latest event details: ${eventUrl}\n\nQuestions about your ticket? Reply to this email. — Function Hour`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#241a2c;background:#fff"><p style="font-size:12px;font-weight:800;letter-spacing:.1em;color:#6d28b5">FUNCTION HOUR · EVENT UPDATE</p><h1 style="font-size:27px;line-height:1.2">${escapeEmailHtml(eventName)}</h1><p style="font-size:17px;font-weight:700">${escapeEmailHtml(detail)}</p><p style="white-space:pre-wrap;line-height:1.6">${escapeEmailHtml(change.message)}</p><p style="margin:26px 0"><a href="${escapeEmailHtml(eventUrl)}" style="display:inline-block;background:#6d28b5;color:#fff;padding:14px 20px;border-radius:9px;text-decoration:none;font-weight:700">View event details</a></p><p style="font-size:13px;line-height:1.6">Questions about your ticket? Reply to this email. — Function Hour</p></div>`,
        });
        await convex.mutation(api.eventOperations.markNoticeSent, { serverSecret, noticeId: notice._id });
        sent++;
      } catch (error) {
        console.error("[event-change-notices] Delivery failed", { changeId: change._id, noticeId: notice._id, error });
      }
    }
    return NextResponse.json({ sent, queued: change.queuedCount, totalSent: change.sentCount + sent, hasMore: notices.length === 10 });
  } catch (error) {
    console.error("[event-change-notices] Dispatch failed", { eventId: id, error });
    return NextResponse.json({ error: "Unable to send notices right now. Retry from Event changes." }, { status: 502 });
  }
}
