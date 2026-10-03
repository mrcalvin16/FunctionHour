import { query } from "./_generated/server";
import { v } from "convex/values";

const MAX_EVENTS = 250;
const MAX_TICKETS_PER_EVENT = 500;
const MAX_AUDIENCE_MEMBERS = 500;

export const getOrganizerAudience = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(MAX_EVENTS);
    const realEvents = events.filter((event) => event.isDemo !== true);

    const audience = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        ticketCount: number;
        checkedInCount: number;
        eventIds: string[];
        eventNames: string[];
        lastActivityAt: number;
        ticketTypes: string[];
      }
    >();

    for (const event of realEvents) {
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event_and_purchasedAt", (q) =>
          q.eq("eventId", event._id)
        )
        .order("desc")
        .take(MAX_TICKETS_PER_EVENT);

      for (const ticket of tickets) {
        if (ticket.status === "cancelled" || ticket.revokedAt) {
          continue;
        }

        const email = ticket.buyerEmail?.trim().toLowerCase() ?? "";
        const identityKey = email || String(ticket.userId);
        const existing = audience.get(identityKey);
        const activityAt =
          ticket.checkedInAt ??
          ticket.purchasedAt ??
          ticket.createdAt ??
          ticket._creationTime;
        const eventId = String(event._id);
        const ticketType = ticket.ticketTypeName || "General Admission";

        if (existing) {
          existing.ticketCount += 1;
          existing.checkedInCount += ticket.checkedIn ? 1 : 0;
          existing.lastActivityAt = Math.max(existing.lastActivityAt, activityAt);

          if (!existing.eventIds.includes(eventId)) {
            existing.eventIds.push(eventId);
            existing.eventNames.push(event.name);
          }

          if (!existing.ticketTypes.includes(ticketType)) {
            existing.ticketTypes.push(ticketType);
          }

          if (existing.name === "Guest" && ticket.buyerName?.trim()) {
            existing.name = ticket.buyerName.trim();
          }

          continue;
        }

        audience.set(identityKey, {
          id: identityKey,
          name: ticket.buyerName?.trim() || "Guest",
          email,
          ticketCount: 1,
          checkedInCount: ticket.checkedIn ? 1 : 0,
          eventIds: [eventId],
          eventNames: [event.name],
          lastActivityAt: activityAt,
          ticketTypes: [ticketType],
        });
      }
    }

    const requestedLimit = Math.max(1, Math.floor(args.limit ?? MAX_AUDIENCE_MEMBERS));

    return Array.from(audience.values())
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      .slice(0, Math.min(requestedLimit, MAX_AUDIENCE_MEMBERS));
  },
});
