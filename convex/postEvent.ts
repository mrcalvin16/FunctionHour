import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireEventCapability } from "./eventAccess";

const invalid = new Set(["refunded", "revoked", "cancelled", "canceled"]);

export const getRetentionSnapshot = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireEventCapability(ctx, eventId, "view_reports");
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found.");
    const tickets = await ctx.db.query("tickets").withIndex("by_event", (q) => q.eq("eventId", eventId)).take(501);
    const active = tickets.slice(0, 500).filter((ticket) => !invalid.has(ticket.status?.toLowerCase() ?? "active"));
    const checkedIn = active.filter((ticket) => ticket.checkedIn);
    const guests = new Map<string, typeof active[number]>();
    for (const ticket of checkedIn) guests.set(String(ticket.userId), ticket);
    let returning = 0;
    for (const ticket of [...guests.values()].slice(0, 75)) {
      const prior = await ctx.db.query("tickets").withIndex("by_user", (q) => q.eq("userId", ticket.userId)).take(20);
      if (prior.some((other) => other.eventId !== eventId && other.checkedIn && (other.checkedInAt ?? 0) < event.eventDate && !invalid.has(other.status?.toLowerCase() ?? "active"))) returning++;
    }
    return {
      eventEnded: event.eventDate < Date.now(),
      ticketCount: active.length,
      checkedInCount: checkedIn.length,
      uniqueAttendees: guests.size,
      returningAttendees: returning,
      limited: tickets.length > 500 || guests.size > 75,
      returnSampleSize: Math.min(guests.size, 75),
      eventName: event.name,
    };
  },
});
