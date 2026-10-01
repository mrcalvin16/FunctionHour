import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Stripe } from "stripe";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getConvexClient } from "@/lib/convex";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";
import { getStripeClient } from "@/lib/stripe/server";
import { evaluateTicketRecovery } from "@/lib/ticketRecovery";

export const dynamic = "force-dynamic";

const sessionPattern = /^cs_(?:live|test)_[A-Za-z0-9]+$/;
const intentPattern = /^pi_[A-Za-z0-9]+$/;
const recoveryInput = z.object({
  sessionId: z.string().regex(sessionPattern),
  confirmation: z.string(),
});
const ticketLines = z.array(z.object({
  ticketTypeId: z.string().optional(), quantity: z.number().int().min(1).max(10),
})).min(1).max(10);

function serverSecret() {
  const value = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!value) throw new Error("Order review is not configured.");
  return value;
}

function quantityFromSession(session: Stripe.Checkout.Session) {
  try {
    const lines = ticketLines.parse(JSON.parse(session.metadata?.tickets || "[]"));
    const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
    return quantity <= 25 ? { lines, quantity } : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  if (!(await hasFunctionHourAdminAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  try {
    const search = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (search.length > 254) return NextResponse.json({ error: "Search is too long." }, { status: 400 });
    const stripe = getStripeClient();
    let sessions: Stripe.Checkout.Session[];
    let hasMore = false;
    if (sessionPattern.test(search)) {
      sessions = [await stripe.checkout.sessions.retrieve(search)];
    } else {
      const options: Stripe.Checkout.SessionListParams = { limit: 100, status: "complete" };
      if (intentPattern.test(search)) options.payment_intent = search;
      else if (search.includes("@")) options.customer_details = { email: search.toLowerCase() };
      const result = await stripe.checkout.sessions.list(options);
      sessions = result.data;
      hasMore = result.has_more;
    }
    const ticketSessions = sessions.filter((session) => session.metadata?.checkoutType === "ticket");
    const records = await getConvexClient().query(api.tickets.getAdminOrderRecords, {
      serverSecret: serverSecret(), sessionIds: ticketSessions.map((session) => session.id),
    });
    const bySession = new Map(records.map((record) => [record.sessionId, record]));
    let rows = ticketSessions.map((session) => {
      const record = bySession.get(session.id);
      return {
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string"
          ? session.payment_intent : session.payment_intent?.id || null,
        eventId: session.metadata?.eventId || null,
        eventName: session.metadata?.eventName || "Event",
        buyerEmail: session.customer_details?.email || session.metadata?.buyerEmail || "",
        amount: session.amount_total ?? 0,
        currency: session.currency || "usd",
        paidAt: session.created * 1000,
        paymentStatus: session.payment_status,
        expectedQuantity: quantityFromSession(session)?.quantity || 0,
        order: record?.order || null,
        ticketCount: record?.ticketCount || 0,
        activeTicketCount: record?.activeTicketCount || 0,
        recoveryActions: record?.recoveryActions || [],
      };
    });
    if (search && !sessionPattern.test(search) && !intentPattern.test(search) && !search.includes("@")) {
      const needle = search.toLowerCase();
      rows = rows.filter((row) => row.eventName.toLowerCase().includes(needle) || row.eventId === search);
    }
    return NextResponse.json({ rows, hasMore, scanned: sessions.length }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[admin.orders] Search failed", error);
    return NextResponse.json({ error: "Unable to load orders. Check the Stripe and Convex connections." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  if (origin !== requestOrigin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!(await hasFunctionHourAdminAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const parsed = recoveryInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmation !== `RECOVER ${parsed.data.sessionId}`) {
    return NextResponse.json({ error: "Confirm the exact Checkout Session ID before recovery." }, { status: 400 });
  }
  const { sessionId } = parsed.data;
  const reviewer = (await auth()).userId!;
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.checkoutType !== "ticket") {
      return NextResponse.json({ error: "Only ticket purchases can be recovered." }, { status: 409 });
    }
    const eventId = session.metadata.eventId;
    const buyerEmail = session.metadata.buyerEmail?.trim().toLowerCase();
    const selection = quantityFromSession(session);
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent : session.payment_intent?.id;
    if (!eventId || !buyerEmail || !z.string().email().safeParse(buyerEmail).success ||
        !selection || !paymentIntentId || !session.metadata.reservationId) {
      return NextResponse.json({ error: "Checkout metadata is incomplete. Escalate for manual review." }, { status: 409 });
    }
    const paidEmail = session.customer_details?.email?.trim().toLowerCase();
    if (paidEmail && paidEmail !== buyerEmail) {
      return NextResponse.json({ error: "Buyer email differs from the paid checkout. Escalate for manual review." }, { status: 409 });
    }
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    const charge = typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
    if (paymentIntent.metadata?.eventId !== eventId ||
        paymentIntent.metadata?.reservationId !== session.metadata.reservationId ||
        paymentIntent.amount_received !== session.amount_total || !charge?.paid) {
      return NextResponse.json({ error: "Payment details do not match this checkout. Escalate for manual review." }, { status: 409 });
    }
    const convex = getConvexClient();
    const secret = serverSecret();
    const [before] = await convex.query(api.tickets.getAdminOrderRecords, { serverSecret: secret, sessionIds: [sessionId] });
    const eligibility = evaluateTicketRecovery({
      sessionId, checkoutType: session.metadata.checkoutType,
      sessionStatus: session.status, paymentStatus: session.payment_status,
      livemode: session.livemode, paymentIntentStatus: paymentIntent.status,
      chargeAmount: charge?.amount || 0, refundedAmount: charge?.amount_refunded || 0,
      expectedQuantity: selection.quantity, ticketCount: before.ticketCount,
      orderRecorded: Boolean(before.order),
    });
    if (eligibility.kind === "blocked") {
      return NextResponse.json({ error: eligibility.reason }, { status: 409 });
    }
    if (eligibility.kind === "already_fulfilled") {
      return NextResponse.json({ status: "already_fulfilled", ticketCount: before.ticketCount });
    }
    const actionId = await convex.mutation(api.tickets.beginAdminTicketRecovery, {
      serverSecret: secret, sessionId, reviewedBy: reviewer,
      beforeOrderRecorded: Boolean(before.order), beforeTicketCount: before.ticketCount,
    });
    try {
      await convex.mutation(api.tickets.createTicketsAfterPayment, {
      webhookSecret: secret, eventId: eventId as Id<"events">, buyerEmail,
      buyerUserId: session.metadata.buyerUserId || undefined,
      buyerName: session.metadata.buyerName || undefined,
      stripeCheckoutSessionId: sessionId, stripePaymentIntentId: paymentIntentId,
      reservationId: session.metadata.reservationId,
      tickets: selection.lines.map((line) => ({
        ticketTypeId: line.ticketTypeId as Id<"ticketTypes"> | undefined,
        quantity: line.quantity,
      })),
      });
      await convex.mutation(api.tickets.recordTicketOrder, {
      webhookSecret: secret, eventId: eventId as Id<"events">,
      stripeCheckoutSessionId: sessionId, stripePaymentIntentId: paymentIntentId,
      buyerUserId: session.metadata.buyerUserId || undefined,
      buyerEmail, buyerName: session.metadata.buyerName || undefined,
      currency: session.currency || "usd", grossAmount: (session.amount_total ?? 0) / 100,
      platformFeeAmount: Number(session.metadata.platformFeeAmount || 0),
      quantity: selection.quantity, paidAt: session.created * 1000,
      discountCodeId: session.metadata.discountCodeId
        ? session.metadata.discountCodeId as Id<"discountCodes"> : undefined,
      discountAmount: Number(session.metadata.discountAmount || 0),
      });
      if (charge.amount_refunded > 0) {
        await convex.mutation(api.tickets.recordTicketRefund, {
        webhookSecret: secret, stripePaymentIntentId: paymentIntentId,
        refundedAmount: charge.amount_refunded / 100,
        });
      }
      const [after] = await convex.query(api.tickets.getAdminOrderRecords, { serverSecret: secret, sessionIds: [sessionId] });
      if (!after.order || after.ticketCount !== selection.quantity) throw new Error("Recovery did not reconcile the order and ticket count.");
      let emailStatus: "accepted" | "failed" | "skipped" = before.ticketCount ? "skipped" : "failed";
      if (!before.ticketCount) {
        try {
        const eventName = session.metadata.eventName || "your event";
        const ticketsUrl = new URL("/my-tickets", process.env.NEXT_PUBLIC_APP_URL || requestOrigin).toString();
          await sendTransactionalEmail({
          to: buyerEmail, subject: `Your Function Hour tickets for ${eventName}`,
          idempotencyKey: `paid-ticket-${sessionId}`,
          text: `Your payment is confirmed. ${selection.quantity} ticket(s) for ${eventName} are ready. Open your tickets: ${ticketsUrl}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#171717"><h1>Your tickets are ready</h1><p>${selection.quantity} ticket(s) for ${escapeEmailHtml(eventName)}</p><p><a href="${ticketsUrl}">Open My Tickets</a></p></div>`,
          });
          emailStatus = "accepted";
        } catch (error) { console.error("[admin.orders] Recovery email failed", { sessionId, error }); }
      }
      await convex.mutation(api.tickets.finishAdminTicketRecovery, {
      serverSecret: secret, actionId, status: "completed",
      afterTicketCount: after.ticketCount, emailStatus,
      });
      console.info("[admin.orders] Recovery completed", { sessionId, reviewer, emailStatus });
      return NextResponse.json({ status: "recovered", ticketCount: after.ticketCount, emailStatus });
    } catch (error) {
      try { await convex.mutation(api.tickets.finishAdminTicketRecovery, {
        serverSecret: secret, actionId, status: "failed",
      }); } catch (auditError) { console.error("[admin.orders] Audit update failed", { sessionId, auditError }); }
      throw error;
    }
  } catch (error) {
    console.error("[admin.orders] Recovery failed", { sessionId, reviewer, error });
    return NextResponse.json({ error: "Recovery could not finish. Inspect this session and Stripe before retrying." }, { status: 502 });
  }
}
