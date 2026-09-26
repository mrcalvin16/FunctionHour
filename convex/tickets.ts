import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireEventCapability } from "./eventAccess";
import { requireEventSalesOpen } from "./eventDates";

const CHECKOUT_RESERVATION_MS = 32 * 60 * 1000;

type TicketIdentity = {
  subject: string;
  tokenIdentifier: string;
  email?: string | null;
};

async function getTicketOwnerIdentifiers(
  ctx: QueryCtx | MutationCtx,
  identity: TicketIdentity,
) {
  const profileByToken = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .first();
  const profileByClerkId = profileByToken
    ? null
    : await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
  const profileByUserId = profileByToken || profileByClerkId
    ? null
    : await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .first();
  const profile = profileByToken ?? profileByClerkId ?? profileByUserId;

  return [
    ...new Set(
      [
        identity.subject,
        identity.email?.trim().toLowerCase(),
        profile?.email?.trim().toLowerCase(),
      ].filter((value): value is string => Boolean(value)),
    ),
  ];
}

export const getOrganizerOrders = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 500), 1), 1000);
    const groups = await Promise.all(
      events.map(async (event) => {
        const orders = await ctx.db
          .query("ticketOrders")
          .withIndex("by_event_and_paidAt", (q) => q.eq("eventId", event._id))
          .order("desc")
          .take(limit);
        return orders.map((order) => ({ ...order, eventName: event.name }));
      }),
    );
    return groups
      .flat()
      .sort((a, b) => b.paidAt - a.paidAt)
      .slice(0, limit);
  },
});

function requireCheckoutSecret(secret: string) {
  const sharedSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;

  if (!sharedSecret || secret !== sharedSecret) {
    throw new Error("Unauthorized checkout request.");
  }
}

export const reserveTicketsForCheckout = mutation({
  args: {
    checkoutSecret: v.string(),
    reservationId: v.string(),
    eventId: v.id("events"),
    ticketTypeId: v.optional(v.id("ticketTypes")),
    buyerEmail: v.string(),
    buyerName: v.optional(v.string()),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    requireCheckoutSecret(args.checkoutSecret);

    if (
      !Number.isSafeInteger(args.quantity) ||
      args.quantity < 1 ||
      args.quantity > 10
    ) {
      throw new Error("Ticket quantity must be between 1 and 10.");
    }

    const duplicate = await ctx.db
      .query("ticketCheckoutReservations")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .unique();

    if (duplicate) {
      throw new Error("Checkout reservation already exists.");
    }

    const normalizedBuyerEmail = args.buyerEmail.trim().toLowerCase();
    const existingReservation = await ctx.db
      .query("ticketCheckoutReservations")
      .withIndex("by_buyer_event_status", (q) =>
        q
          .eq("buyerEmail", normalizedBuyerEmail)
          .eq("eventId", args.eventId)
          .eq("status", "pending"),
      )
      .first();

    if (existingReservation) {
      if (existingReservation.expiresAt <= Date.now()) {
        await releaseReservation(ctx, existingReservation.reservationId);
      } else if (
        existingReservation.ticketTypeId === args.ticketTypeId &&
        existingReservation.quantity === args.quantity
      ) {
        if (!existingReservation.stripeCheckoutSessionId) {
          throw new Error("Your checkout is already being prepared.");
        }

        return {
          reservationId: existingReservation.reservationId,
          eventName: "",
          ticketTypeName: existingReservation.ticketTypeName,
          ticketTypeDescription: undefined,
          quantity: existingReservation.quantity,
          unitPrice: existingReservation.unitPrice,
          expiresAt: existingReservation.expiresAt,
          stripeCheckoutSessionId: existingReservation.stripeCheckoutSessionId,
        };
      } else {
        throw new Error(
          "You already have a checkout in progress for this event.",
        );
      }
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    requireEventSalesOpen(event);

    let ticketTypeName: string | undefined;
    let ticketTypeDescription: string | undefined;
    let unitPrice = event.price ?? 0;

    if (args.ticketTypeId) {
      const ticketType = await ctx.db.get(args.ticketTypeId);

      if (!ticketType || ticketType.eventId !== args.eventId) {
        throw new Error("Ticket type not found for this event.");
      }

      if (
        ticketType.isActive === false ||
        ticketType.isSoldOut === true ||
        ticketType.salesPaused === true
      ) {
        throw new Error("This ticket option is not currently available.");
      }

      if (
        ticketType.quantity !== undefined &&
        (ticketType.sold ?? 0) + args.quantity > ticketType.quantity
      ) {
        throw new Error("There are not enough tickets remaining.");
      }

      ticketTypeName = ticketType.name;
      ticketTypeDescription = ticketType.description;
      unitPrice = ticketType.price;

      await ctx.db.patch(args.ticketTypeId, {
        sold: (ticketType.sold ?? 0) + args.quantity,
      });
    } else if (
      event.totalTickets !== undefined &&
      (event.ticketsSold ?? 0) + args.quantity > event.totalTickets
    ) {
      throw new Error("There are not enough tickets remaining.");
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("This ticket does not require paid checkout.");
    }

    const now = Date.now();
    const expiresAt = now + CHECKOUT_RESERVATION_MS;

    await ctx.db.patch(args.eventId, {
      ticketsSold: (event.ticketsSold ?? 0) + args.quantity,
    });

    await ctx.db.insert("ticketCheckoutReservations", {
      reservationId: args.reservationId,
      eventId: args.eventId,
      ticketTypeId: args.ticketTypeId,
      ticketTypeName,
      buyerEmail: normalizedBuyerEmail,
      buyerName: args.buyerName,
      quantity: args.quantity,
      unitPrice,
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAt(
      expiresAt,
      internal.tickets.releaseExpiredCheckoutReservation,
      { reservationId: args.reservationId },
    );

    return {
      reservationId: args.reservationId,
      eventName: event.name,
      ticketTypeName,
      ticketTypeDescription,
      quantity: args.quantity,
      unitPrice,
      expiresAt,
      stripeCheckoutSessionId: undefined,
    };
  },
});

export const attachCheckoutSession = mutation({
  args: {
    checkoutSecret: v.string(),
    reservationId: v.string(),
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    requireCheckoutSecret(args.checkoutSecret);
    const reservation = await ctx.db
      .query("ticketCheckoutReservations")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .unique();

    if (!reservation || reservation.status !== "pending") {
      throw new Error("Checkout reservation is no longer active.");
    }

    await ctx.db.patch(reservation._id, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: Date.now(),
    });
  },
});

async function releaseReservation(ctx: MutationCtx, reservationId: string) {
  const reservation = await ctx.db
    .query("ticketCheckoutReservations")
    .withIndex("by_reservationId", (q) => q.eq("reservationId", reservationId))
    .unique();

  if (!reservation || reservation.status !== "pending") return false;

  const event = await ctx.db.get(reservation.eventId);
  if (event) {
    await ctx.db.patch(reservation.eventId, {
      ticketsSold: Math.max(0, (event.ticketsSold ?? 0) - reservation.quantity),
    });
  }

  if (reservation.ticketTypeId) {
    const ticketType = await ctx.db.get(reservation.ticketTypeId);
    if (ticketType) {
      await ctx.db.patch(reservation.ticketTypeId, {
        sold: Math.max(0, (ticketType.sold ?? 0) - reservation.quantity),
      });
    }
  }

  await ctx.db.patch(reservation._id, {
    status: "released",
    updatedAt: Date.now(),
  });
  return true;
}

export const releaseCheckoutReservation = mutation({
  args: { checkoutSecret: v.string(), reservationId: v.string() },
  handler: async (ctx, args) => {
    requireCheckoutSecret(args.checkoutSecret);
    return await releaseReservation(ctx, args.reservationId);
  },
});

export const releaseExpiredCheckoutReservation = internalMutation({
  args: { reservationId: v.string() },
  handler: async (ctx, args) => {
    const reservation = await ctx.db
      .query("ticketCheckoutReservations")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .unique();

    if (!reservation || reservation.expiresAt > Date.now()) return false;
    return await releaseReservation(ctx, args.reservationId);
  },
});

export const createTicket = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const attendeeIdentifiers = await getTicketOwnerIdentifiers(ctx, identity);

    let existingTicket = null;

    for (const attendeeId of new Set(attendeeIdentifiers)) {
      existingTicket = await ctx.db
        .query("tickets")
        .withIndex("by_event_user", (q) =>
          q.eq("eventId", args.eventId).eq("userId", attendeeId),
        )
        .first();

      if (existingTicket) {
        break;
      }
    }

    if (existingTicket) {
      throw new Error("You already have a ticket for this event.");
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    requireEventSalesOpen(event);

    const ticketId = await ctx.db.insert("tickets", {
      eventId: args.eventId,
      userId: identity.subject,
      status: "active",
      checkedIn: false,
      purchasedAt: Date.now(),
      createdAt: Date.now(),
      qrCode: `${args.eventId}:${identity.subject}:${Date.now()}`,
    });

    await ctx.db.patch(args.eventId, {
      ticketsSold: (event.ticketsSold ?? 0) + 1,
    });

    return ticketId;
  },
});

export const createTicketsAfterPayment = mutation({
  args: {
    webhookSecret: v.string(),
    eventId: v.id("events"),
    buyerEmail: v.string(),
    buyerUserId: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    reservationId: v.optional(v.string()),
    tickets: v.array(
      v.object({
        ticketTypeId: v.optional(v.id("ticketTypes")),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const sharedSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;

    if (!sharedSecret || args.webhookSecret !== sharedSecret) {
      throw new Error("Unauthorized webhook.");
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    const existing = await ctx.db
      .query("tickets")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .first();

    if (existing) {
      return true;
    }

    if (args.reservationId) {
      const reservation = await ctx.db
        .query("ticketCheckoutReservations")
        .withIndex("by_reservationId", (q) =>
          q.eq("reservationId", args.reservationId!),
        )
        .unique();

      if (
        !reservation ||
        (reservation.status !== "pending" && reservation.status !== "released")
      ) {
        throw new Error("Checkout reservation is not eligible for fulfillment.");
      }

      if (
        reservation.eventId !== args.eventId ||
        reservation.buyerEmail !== args.buyerEmail.trim().toLowerCase()
      ) {
        throw new Error("Checkout reservation details do not match.");
      }

      if (
        reservation.stripeCheckoutSessionId !== args.stripeCheckoutSessionId
      ) {
        throw new Error("Checkout session does not match reservation.");
      }

      if (reservation.status === "released") {
        // The signed Stripe webhook confirms this exact session was paid. The
        // reservation cleanup may have returned its inventory before a webhook
        // retry arrived, so restore the counters while honoring the purchase.
        console.warn("Fulfilling paid ticket after reservation release", {
          eventId: args.eventId,
          reservationId: reservation.reservationId,
          stripeCheckoutSessionId: args.stripeCheckoutSessionId,
        });
        await ctx.db.patch(args.eventId, {
          ticketsSold: (event.ticketsSold ?? 0) + reservation.quantity,
        });
        if (reservation.ticketTypeId) {
          const ticketType = await ctx.db.get(reservation.ticketTypeId);
          if (ticketType && ticketType.eventId === args.eventId) {
            await ctx.db.patch(reservation.ticketTypeId, {
              sold: (ticketType.sold ?? 0) + reservation.quantity,
            });
          }
        }
      }

      for (let i = 0; i < reservation.quantity; i++) {
        await ctx.db.insert("tickets", {
          eventId: reservation.eventId,
          userId: args.buyerUserId || reservation.buyerEmail,
          buyerEmail: reservation.buyerEmail,
          buyerName: reservation.buyerName,
          ticketTypeId: reservation.ticketTypeId,
          ticketTypeName: reservation.ticketTypeName,
          unitPrice: reservation.unitPrice,
          stripeCheckoutSessionId: args.stripeCheckoutSessionId,
          stripePaymentIntentId: args.stripePaymentIntentId,
          ticketSource: "stripe",
          status: "active",
          checkedIn: false,
          purchasedAt: Date.now(),
          createdAt: Date.now(),
          qrCode: `${reservation.eventId}:${reservation.buyerEmail}:${Date.now()}:${i}`,
        });
      }

      await ctx.db.patch(reservation._id, {
        status: "completed",
        stripeCheckoutSessionId: args.stripeCheckoutSessionId,
        updatedAt: Date.now(),
      });

      return true;
    }

    const normalizedBuyerEmail = args.buyerEmail.trim().toLowerCase();
    const totalQuantity = args.tickets.reduce(
      (sum, line) => sum + Math.max(0, line.quantity),
      0,
    );

    if (totalQuantity <= 0) {
      throw new Error("Please select at least one ticket.");
    }

    for (const line of args.tickets) {
      if (line.quantity <= 0) continue;

      let ticketTypeName: string | undefined = undefined;
      let unitPrice = event.price ?? 0;

      if (line.ticketTypeId) {
        const ticketType = await ctx.db.get(line.ticketTypeId);

        if (!ticketType) {
          throw new Error("Ticket type not found.");
        }

        if (ticketType.eventId !== args.eventId) {
          throw new Error("Ticket type does not belong to this event.");
        }

        ticketTypeName = ticketType.name;
        unitPrice = ticketType.price;

        await ctx.db.patch(line.ticketTypeId, {
          sold: (ticketType.sold ?? 0) + line.quantity,
        });
      }

      for (let i = 0; i < line.quantity; i++) {
        await ctx.db.insert("tickets", {
          eventId: args.eventId,
          userId: args.buyerUserId || normalizedBuyerEmail,
          buyerEmail: normalizedBuyerEmail,
          buyerName: args.buyerName,
          ticketTypeId: line.ticketTypeId,
          ticketTypeName,
          unitPrice,
          stripeCheckoutSessionId: args.stripeCheckoutSessionId,
          stripePaymentIntentId: args.stripePaymentIntentId,
          ticketSource: "stripe",
          status: "active",
          checkedIn: false,
          purchasedAt: Date.now(),
          createdAt: Date.now(),
          qrCode: `${args.eventId}:${normalizedBuyerEmail}:${Date.now()}:${i}`,
        });
      }
    }

    await ctx.db.patch(args.eventId, {
      ticketsSold: (event.ticketsSold ?? 0) + totalQuantity,
    });

    return true;
  },
});

export const recordTicketOrder = mutation({
  args: {
    webhookSecret: v.string(),
    eventId: v.id("events"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    buyerUserId: v.optional(v.string()),
    buyerEmail: v.string(),
    buyerName: v.optional(v.string()),
    currency: v.string(),
    grossAmount: v.number(),
    platformFeeAmount: v.optional(v.number()),
    quantity: v.number(),
    paidAt: v.number(),
    discountCodeId: v.optional(v.id("discountCodes")),
    discountAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireCheckoutSecret(args.webhookSecret);

    const existing = await ctx.db
      .query("ticketOrders")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .unique();

    if (existing) return existing._id;

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found.");

    const grossAmount = Math.max(0, args.grossAmount);
    const platformFeeAmount = Math.min(
      grossAmount,
      Math.max(0, args.platformFeeAmount ?? 0),
    );
    const now = Date.now();

    const orderId = await ctx.db.insert("ticketOrders", {
      eventId: args.eventId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      buyerUserId: args.buyerUserId,
      buyerEmail: args.buyerEmail.trim().toLowerCase(),
      buyerName: args.buyerName,
      currency: args.currency.toLowerCase(),
      grossAmount,
      platformFeeAmount,
      refundedAmount: 0,
      netAmount: Math.max(0, grossAmount - platformFeeAmount),
      quantity: Math.max(1, Math.floor(args.quantity)),
      discountCodeId: args.discountCodeId,
      discountAmount: Math.max(0, args.discountAmount ?? 0),
      status: "paid",
      paidAt: args.paidAt,
      updatedAt: now,
    });

    if (args.discountCodeId) {
      const discount = await ctx.db.get(args.discountCodeId);
      if (discount && discount.eventId === args.eventId) {
        await ctx.db.patch(args.discountCodeId, {
          redemptionCount: (discount.redemptionCount ?? 0) + 1,
          updatedAt: now,
        });
      }
    }

    return orderId;
  },
});

export const recordTicketRefund = mutation({
  args: {
    webhookSecret: v.string(),
    stripePaymentIntentId: v.string(),
    refundedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    requireCheckoutSecret(args.webhookSecret);

    const order = await ctx.db
      .query("ticketOrders")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
      )
      .unique();

    if (!order) return false;

    const refundedAmount = Math.min(
      order.grossAmount,
      Math.max(0, args.refundedAmount),
    );
    const fullyRefunded = refundedAmount >= order.grossAmount;
    const ticketProceeds = Math.max(
      0,
      order.grossAmount - (order.platformFeeAmount ?? 0),
    );

    await ctx.db.patch(order._id, {
      refundedAmount,
      netAmount: Math.max(
        0,
        ticketProceeds - Math.min(ticketProceeds, refundedAmount),
      ),
      status: fullyRefunded ? "refunded" : "partially_refunded",
      updatedAt: Date.now(),
    });

    if (!fullyRefunded || order.status === "refunded") return true;

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", order.stripeCheckoutSessionId),
      )
      .take(25);
    const activeTickets = tickets.filter(
      (ticket) => ticket.status !== "refunded",
    );

    if (activeTickets.length === 0) return true;

    const event = await ctx.db.get(order.eventId);
    if (event) {
      await ctx.db.patch(order.eventId, {
        ticketsSold: Math.max(
          0,
          (event.ticketsSold ?? 0) - activeTickets.length,
        ),
      });
    }

    const refundedByType = new Map<string, number>();
    for (const ticket of activeTickets) {
      await ctx.db.patch(ticket._id, { status: "refunded" });
      if (ticket.ticketTypeId) {
        const key = String(ticket.ticketTypeId);
        refundedByType.set(key, (refundedByType.get(key) ?? 0) + 1);
      }
    }

    for (const [ticketTypeId, quantity] of refundedByType) {
      const typedId = ticketTypeId as Id<"ticketTypes">;
      const ticketType = await ctx.db.get(typedId);
      if (ticketType) {
        await ctx.db.patch(typedId, {
          sold: Math.max(0, (ticketType.sold ?? 0) - quantity),
        });
      }
    }

    return true;
  },
});

export const getUserTickets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const attendeeIdentifiers = await getTicketOwnerIdentifiers(ctx, identity);

    const ticketGroups = await Promise.all(
      [...new Set(attendeeIdentifiers)].map((attendeeId) =>
        ctx.db
          .query("tickets")
          .withIndex("by_user", (q) => q.eq("userId", attendeeId))
          .order("desc")
          .take(100),
      ),
    );

    const tickets = [
      ...new Map(
        ticketGroups.flat().map((ticket) => [String(ticket._id), ticket]),
      ).values(),
    ];

    return await Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);

        let imageUrl = null;

        if (event?.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(event.imageStorageId);
        }

        return {
          ...ticket,
          event,
          imageUrl,
        };
      }),
    );
  },
});

export const getMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const identifiers = await getTicketOwnerIdentifiers(ctx, identity);
    const orderGroups = await Promise.all(
      identifiers.flatMap((identifier) => [
        ctx.db
          .query("ticketOrders")
          .withIndex("by_buyerUserId", (q) =>
            q.eq("buyerUserId", identifier),
          )
          .take(100),
        ctx.db
          .query("ticketOrders")
          .withIndex("by_buyerEmail", (q) =>
            q.eq("buyerEmail", identifier),
          )
          .take(100),
      ]),
    );
    const orders = [
      ...new Map(
        orderGroups
          .flat()
          .map((order) => [String(order._id), order]),
      ).values(),
    ]
      .sort((left, right) => right.paidAt - left.paidAt)
      .slice(0, 100);

    return await Promise.all(
      orders.map(async (order) => {
        const [event, tickets] = await Promise.all([
          ctx.db.get(order.eventId),
          ctx.db
            .query("tickets")
            .withIndex("by_stripeCheckoutSessionId", (q) =>
              q.eq("stripeCheckoutSessionId", order.stripeCheckoutSessionId),
            )
            .take(25),
        ]);

        return {
          ...order,
          eventName: event?.name ?? "Event",
          eventDate: event?.eventDate,
          ticketCount: tickets.length,
        };
      }),
    );
  },
});

export const getTicketsByEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "view_reports");

    return await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(2_000);
  },
});

export const getMyTicketForEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const attendeeIdentifiers = await getTicketOwnerIdentifiers(ctx, identity);

    for (const attendeeId of new Set(attendeeIdentifiers)) {
      const ticket = await ctx.db
        .query("tickets")
        .withIndex("by_event_user", (q) =>
          q.eq("eventId", args.eventId).eq("userId", attendeeId),
        )
        .first();

      if (ticket) {
        return ticket;
      }
    }

    return null;
  },
});

export const checkInTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    await requireEventCapability(ctx, ticket.eventId, "check_in");

    if (ticket.checkedIn) {
      throw new Error("Ticket has already been checked in.");
    }

    await ctx.db.patch(args.ticketId, {
      checkedIn: true,
      checkedInAt: Date.now(),
      status: "checked_in",
    });

    return true;
  },
});

export const getTicketByQRCode = query({
  args: {
    eventId: v.id("events"),
    qrCode: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "check_in");

    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_qrCode", (q) => q.eq("qrCode", args.qrCode.trim()))
      .first();

    return ticket?.eventId === args.eventId ? ticket : null;
  },
});

export const getTicketDetails = query({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      return null;
    }

    const attendeeIdentifiers = new Set(await getTicketOwnerIdentifiers(ctx, identity));

    if (!attendeeIdentifiers.has(String(ticket.userId))) {
      return null;
    }

    const [event, profileByTokenIdentifier, ticketType] = await Promise.all([
      ctx.db.get(ticket.eventId),
      ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
          q.eq("tokenIdentifier", identity.tokenIdentifier),
        )
        .first(),
      ticket.ticketTypeId ? ctx.db.get(ticket.ticketTypeId) : null,
    ]);

    const profileByClerkId = profileByTokenIdentifier
      ? null
      : await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
          .first();

    const profileByUserId =
      profileByTokenIdentifier || profileByClerkId
        ? null
        : await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

    const currentProfile =
      profileByTokenIdentifier ?? profileByClerkId ?? profileByUserId;

    const organizerId = event?.organizerId ?? event?.userId;
    const organizerByClerkId = organizerId
      ? await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", organizerId))
          .first()
      : null;
    const organizerByUserId = organizerId
      ? await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", organizerId))
          .first()
      : null;
    const organizer = organizerByClerkId ?? organizerByUserId;
    const organizerName =
      organizer?.organizerName?.trim() || organizer?.name?.trim();
    const venueName = event?.venueName?.trim();
    const sourceName =
      [organizerName, venueName]
        .filter(
          (value, index, values): value is string =>
            Boolean(value) && values.indexOf(value) === index,
        )
        .join(" · ") ||
      event?.name ||
      "Event organizer";

    let imageUrl = null;

    if (event?.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(event.imageStorageId);
    }

    return {
      ...ticket,
      unitPrice: ticket.unitPrice ?? ticketType?.price ?? event?.price,
      event,
      imageUrl,
      sourceName,
      holder: {
        name:
          ticket.buyerName || currentProfile?.name || identity.name || "Guest",
        email:
          ticket.buyerEmail ||
          currentProfile?.email ||
          identity.email?.trim().toLowerCase() ||
          "",
        userId: String(ticket.userId),
      },
    };
  },
});

export const cancelTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    const attendeeIdentifiers = new Set(await getTicketOwnerIdentifiers(ctx, identity));

    if (!attendeeIdentifiers.has(String(ticket.userId))) {
      throw new Error("You do not have permission to cancel this ticket.");
    }

    const event = await ctx.db.get(ticket.eventId);

    await ctx.db.patch(args.ticketId, {
      status: "cancelled",
    });

    if (event) {
      await ctx.db.patch(ticket.eventId, {
        ticketsSold: Math.max((event.ticketsSold ?? 1) - 1, 0),
      });
    }

    return true;
  },
});

export const getAttendeesByEvent = query({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(12);

    const attendees = await Promise.all(
      tickets.map(async (ticket) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_userId", (q) => q.eq("userId", String(ticket.userId)))
          .first();

        return {
          id: ticket._id,
          name: user?.organizerName || user?.name || "Guest",
          avatarUrl: user?.avatarUrl,
        };
      }),
    );

    return attendees;
  },
});
