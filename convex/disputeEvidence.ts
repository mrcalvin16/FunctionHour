import { v } from "convex/values";
import { query } from "./_generated/server";

export const forPaymentIntent = query({
  args: { serverSecret: v.string(), paymentIntentId: v.string() },
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret || args.serverSecret !== secret) throw new Error("Unauthorized");
    if (!/^pi_[a-zA-Z0-9_]+$/.test(args.paymentIntentId)) throw new Error("Invalid payment identifier");
    const order = await ctx.db.query("ticketOrders")
      .withIndex("by_stripePaymentIntentId", q => q.eq("stripePaymentIntentId", args.paymentIntentId)).first();
    if (!order) return null;
    const event = await ctx.db.get(order.eventId);
    const tickets = await ctx.db.query("tickets")
      .withIndex("by_stripePaymentIntentId", q => q.eq("stripePaymentIntentId", args.paymentIntentId)).take(500);
    const admission = (await ctx.db.query("checkInActivity")
      .withIndex("by_event", q => q.eq("eventId", order.eventId)).take(2000))
      .filter(entry => tickets.some(ticket => ticket._id === entry.ticketId))
      .map(entry => ({
        ticketId: String(entry.ticketId), method: entry.method,
        checkedInAt: entry.checkedInAt, gate: entry.gate || "Main Gate",
        staffRecorded: Boolean(entry.staffUserId),
      }));
    return {
      paymentIntentId: args.paymentIntentId, checkoutSessionId: order.stripeCheckoutSessionId,
      orderStatus: order.status, disputeStatus: order.disputeStatus || null,
      amount: order.grossAmount, refundedAmount: order.refundedAmount,
      currency: order.currency, paidAt: order.paidAt,
      buyerEmail: order.buyerEmail, buyerName: order.buyerName || null,
      terms: order.purchaseTerms || null,
      event: event ? { name: event.name, date: event.eventDate, venue: event.venueName || event.location, status: event.eventStatus || "scheduled" } : null,
      tickets: tickets.map(ticket => ({
        id: String(ticket._id), status: ticket.status || "active",
        revoked: Boolean(ticket.revokedAt), checkedIn: Boolean(ticket.checkedIn),
        checkedInAt: ticket.checkedInAt || null, quantity: ticket.quantity || 1,
      })),
      admission,
      warnings: [
        ...(tickets.length === 0 ? ["No matching ticket records found"] : []),
        ...(admission.some(item => item.method !== "qr") ? ["Some admission records are manual/search entries, not QR-verification proof"] : []),
        ...(admission.length === 0 ? ["No recorded admissions found; this does not establish non-attendance"] : []),
      ],
    };
  },
});
