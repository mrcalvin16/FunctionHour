// SECURITY: ticket status validation
import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  getEventRole,
  requireEventCapability,
  roleCan,
} from "./eventAccess";

async function getTicketGuest(
  ctx: QueryCtx | MutationCtx,
  ticket: Doc<"tickets">
) {
  if (ticket.buyerName || ticket.buyerEmail) {
    return {
      name:
        ticket.buyerName ||
        ticket.buyerEmail ||
        "Guest",
      email: ticket.buyerEmail,
      avatarUrl: undefined,
    };
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_userId", (q) =>
      q.eq("userId", String(ticket.userId))
    )
    .first();

  return {
    name:
      user?.name ||
      user?.organizerName ||
      user?.email ||
      "Guest",
    email: user?.email,
    avatarUrl: user?.avatarUrl,
  };
}

export const getOrganizerEvents = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const [ownedEvents, memberships] =
      await Promise.all([
        ctx.db
          .query("events")
          .withIndex("by_userId", (q) =>
            q.eq("userId", identity.subject)
          )
          .take(100),
        ctx.db
          .query("eventTeamMembers")
          .withIndex("by_user", (q) =>
            q.eq("userId", identity.subject)
          )
          .take(100),
      ]);
    const teamEvents = await Promise.all(
      memberships
        .filter(
          (membership) =>
            membership.status === "active" &&
            roleCan(membership.role, "check_in")
        )
        .map((membership) =>
          ctx.db.get(membership.eventId)
        )
    );
    const accessibleEvents = [
      ...new Map(
        [...ownedEvents, ...teamEvents]
          .filter(
            (event): event is Doc<"events"> =>
              event !== null
          )
          .map((event) => [event._id, event])
      ).values(),
    ];

    return accessibleEvents
      .sort((a, b) => a.eventDate - b.eventDate)
      .map((event) => ({
        _id: event._id,
        name: event.name,
        dateString: event.dateString,
        eventDate: event.eventDate,
        location: event.location,
        venueName: event.venueName,
        totalTickets: event.totalTickets ?? 0,
        ticketsSold: event.ticketsSold ?? 0,
      }));
  },
});

export const getWorkspace = query({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      return null;
    }

    const role = await getEventRole(
      ctx,
      args.eventId,
      identity.subject,
      identity.email
    );

    if (!role || !roleCan(role, "check_in")) {
      return null;
    }

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) =>
        q.eq("eventId", args.eventId)
      )
      .take(2_000);

    const guests = await Promise.all(
      tickets.map(async (ticket) => {
        const guest = await getTicketGuest(ctx, ticket);

        return {
          ticketId: ticket._id,
          name: guest.name,
          email: guest.email ?? "",
          avatarUrl: guest.avatarUrl,
          ticketType: ticket.ticketTypeName ?? "Admission",
          orderNumber: String(ticket._id).slice(-8).toUpperCase(),
          qrCode: ticket.qrCode ?? "",
          quantity: ticket.quantity ?? 1,
          status: ticket.status ?? "active",
          checkedIn: ticket.checkedIn ?? false,
          checkedInAt: ticket.checkedInAt,
        };
      }),
    );

    const recentActivity = await ctx.db
      .query("checkInActivity")
      .withIndex("by_event_time", (q) =>
        q.eq("eventId", args.eventId),
      )
      .order("desc")
      .take(20);
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const recentThroughput = await ctx.db
      .query("checkInActivity")
      .withIndex("by_event_time", (q) =>
        q
          .eq("eventId", args.eventId)
          .gte("checkedInAt", hourAgo)
      )
      .order("desc")
      .take(2_000);
    const gateCounts = new Map<string, number>();
    let lastFiveMinutes = 0;
    let lastFifteenMinutes = 0;

    for (const activity of recentThroughput) {
      const quantity = Math.max(
        1,
        Math.floor(activity.quantity ?? 1)
      );
      const age = now - activity.checkedInAt;
      const activityGate = activity.gate?.trim() || "Main Gate";

      if (age <= 5 * 60 * 1000) lastFiveMinutes += quantity;
      if (age <= 15 * 60 * 1000) lastFifteenMinutes += quantity;
      gateCounts.set(
        activityGate,
        (gateCounts.get(activityGate) ?? 0) + quantity
      );
    }
    const busiestGate = [...gateCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0];

    const checkedInTickets = tickets.filter(
      (ticket) => ticket.checkedIn,
    );

    const checkedInGuests = checkedInTickets.reduce(
      (total, ticket) => total + (ticket.quantity ?? 1),
      0,
    );

    const totalGuests = tickets.reduce(
      (total, ticket) => total + (ticket.quantity ?? 1),
      0,
    );

    return {
      event: {
        _id: event._id,
        name: event.name,
        dateString: event.dateString,
        eventDate: event.eventDate,
        location: event.location,
        venueName: event.venueName,
        totalTickets: event.totalTickets ?? totalGuests,
        ticketsSold: event.ticketsSold ?? totalGuests,
      },

      stats: {
        checkedIn: checkedInGuests,
        remaining: Math.max(totalGuests - checkedInGuests, 0),
        totalGuests,
        orders: tickets.length,
      },

      throughput: {
        lastFiveMinutes,
        lastFifteenMinutes,
        perMinute:
          Math.round((lastFiveMinutes / 5) * 10) / 10,
        activeGates: gateCounts.size,
        busiestGate: busiestGate?.[0] ?? null,
        busiestGateCheckIns: busiestGate?.[1] ?? 0,
        isLimited: recentThroughput.length === 2_000,
      },

      guests,

      recentActivity: recentActivity.map((item) => ({
        _id: item._id,
        ticketId: item.ticketId,
        guestName: item.guestName,
        guestEmail: item.guestEmail ?? "",
        ticketType: item.ticketType ?? "Admission",
        quantity: item.quantity ?? 1,
        method: item.method,
        gate: item.gate ?? "Main Gate",
        checkedInAt: item.checkedInAt,
      })),
    };
  },
});

export const validateCode = query({
  args: {
    eventId: v.id("events"),
    code: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      return null;
    }

    const role = await getEventRole(
      ctx,
      args.eventId,
      identity.subject,
      identity.email
    );

    if (!role || !roleCan(role, "check_in")) {
      return null;
    }

    const normalizedCode = args.code.trim();

    if (!normalizedCode) {
      return null;
    }

    const qrTicket = await ctx.db
      .query("tickets")
      .withIndex("by_qrCode", (q) =>
        q.eq("qrCode", normalizedCode),
      )
      .first();

    let ticket = qrTicket;

    if (!ticket) {
      const eventTickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) =>
          q.eq("eventId", args.eventId)
        )
        .take(2_000);

      ticket =
        eventTickets.find(
          (candidate) =>
            String(candidate._id) === normalizedCode ||
            String(candidate._id)
              .slice(-8)
              .toLowerCase() === normalizedCode.toLowerCase(),
        ) ?? null;
    }

    if (!ticket || ticket.eventId !== args.eventId) {
      return null;
    }

    const guest = await getTicketGuest(ctx, ticket);

    return {
      ticketId: ticket._id,
      guestName: guest.name,
      guestEmail: guest.email ?? "",
      ticketType: ticket.ticketTypeName ?? "Admission",
      quantity: ticket.quantity ?? 1,
      checkedIn: ticket.checkedIn ?? false,
      checkedInAt: ticket.checkedInAt,
    };
  },
});

export const checkInTicket = mutation({
  args: {
    eventId: v.id("events"),
    ticketId: v.id("tickets"),
    method: v.union(
      v.literal("qr"),
      v.literal("manual"),
      v.literal("search"),
    ),
    gate: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const { identity } =
      await requireEventCapability(
        ctx,
        args.eventId,
        "check_in"
      );

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.eventId !== args.eventId) {
      throw new Error("Ticket not found for this event.");
    }

    const guest = await getTicketGuest(ctx, ticket);

    if (ticket.checkedIn) {
      return {
        status: "duplicate" as const,
        ticketId: ticket._id,
        guestName: guest.name,
        guestEmail: guest.email ?? "",
        ticketType: ticket.ticketTypeName ?? "Admission",
        quantity: ticket.quantity ?? 1,
        checkedInAt: ticket.checkedInAt,
      };
    }

    const checkedInAt = Date.now();

    await ctx.db.patch(ticket._id, {
      checkedIn: true,
      checkedInAt,
      status: "checked_in",
    });

    await ctx.db.insert("checkInActivity", {
      eventId: args.eventId,
      ticketId: ticket._id,

      staffUserId: identity.subject,

      guestName: guest.name,
      guestEmail: guest.email,
      ticketType: ticket.ticketTypeName ?? "Admission",

      method: args.method,
      gate: args.gate ?? "Main Gate",

      quantity: ticket.quantity ?? 1,
      checkedInAt,
    });

    return {
      status: "success" as const,
      ticketId: ticket._id,
      guestName: guest.name,
      guestEmail: guest.email ?? "",
      ticketType: ticket.ticketTypeName ?? "Admission",
      quantity: ticket.quantity ?? 1,
      checkedInAt,
    };
  },
});

export const undoCheckIn = mutation({
  args: {
    eventId: v.id("events"),
    ticketId: v.id("tickets"),
  },

  handler: async (ctx, args) => {
    await requireEventCapability(
      ctx,
      args.eventId,
      "check_in"
    );

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.eventId !== args.eventId) {
      throw new Error("Ticket not found for this event.");
    }

    if (!ticket.checkedIn) {
      throw new Error("This ticket is not currently checked in.");
    }

    await ctx.db.patch(ticket._id, {
      checkedIn: false,
      checkedInAt: undefined,
      status: "active",
    });

    const activity = await ctx.db
      .query("checkInActivity")
      .withIndex("by_ticket", (q) =>
        q.eq("ticketId", ticket._id),
      )
      .order("desc")
      .first();

    if (activity) {
      await ctx.db.delete(activity._id);
    }

    return true;
  },
});
