import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireIdentity } from "./eventAccess";

export const getEventExport = query({
  args: {
    eventId: v.id("events"),
    type: v.union(v.literal("attendees"), v.literal("statement")),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || (event.userId !== identity.subject && event.organizerId !== identity.subject)) {
      throw new Error("Only the event owner can export this data.");
    }
    if (event.isDemo) throw new Error("Demo events cannot be exported.");
    if (args.type === "attendees") {
      const tickets = await ctx.db.query("tickets")
        .withIndex("by_event", q => q.eq("eventId", args.eventId)).take(5001);
      if (tickets.length > 5000) throw new Error("Attendee list exceeds the export limit. Contact support.");
      return {
        name: event.name,
        rows: tickets.map(ticket => [
          ticket.buyerName ?? "",
          ticket.buyerEmail ?? "",
          ticket.ticketTypeName ?? "",
          ticket.status ?? "valid",
          ticket.checkedIn ? "Yes" : "No",
          ticket.purchasedAt ? new Date(ticket.purchasedAt).toISOString() : "",
        ]),
      };
    }
    const orders = await ctx.db.query("ticketOrders")
      .withIndex("by_event_and_paidAt", q => q.eq("eventId", args.eventId)).take(5001);
    if (orders.length > 5000) throw new Error("Statement exceeds the export limit. Contact support.");
    return {
      name: event.name,
      rows: orders.map(order => [
        order.stripeCheckoutSessionId,
        order.buyerName ?? "",
        order.buyerEmail,
        String(order.quantity),
        order.currency.toUpperCase(),
        order.grossAmount.toFixed(2),
        order.refundedAmount.toFixed(2),
        order.netAmount.toFixed(2),
        order.status,
        new Date(order.paidAt).toISOString(),
      ]),
    };
  },
});

export const recordExport = mutation({
  args: {
    eventId: v.id("events"),
    type: v.union(v.literal("attendees"), v.literal("statement")),
    rowCount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event || (event.userId !== identity.subject && event.organizerId !== identity.subject)) {
      throw new Error("Only the event owner can export this data.");
    }
    if (!Number.isSafeInteger(args.rowCount) || args.rowCount < 0 || args.rowCount > 5000) {
      throw new Error("Invalid row count.");
    }
    await ctx.db.insert("organizerExportAudit", {
      eventId: args.eventId, actorId: identity.subject,
      type: args.type, rowCount: args.rowCount, createdAt: Date.now(),
    });
  },
});
