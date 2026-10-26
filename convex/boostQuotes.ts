import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEventCapability } from "./eventAccess";
import { buildBoostQuote, assertBoostQuoteEligible } from "../lib/boostQuoteGuardrails";
import { deriveAreaDemand } from "../lib/boostMarketSignals";

const placementValidator = v.union(v.literal("discovery"), v.literal("featured"), v.literal("spotlight"));
const ALLOCATED_SLOTS_PER_AREA = 5; // provisional placement inventory policy

/**
 * Organizer-authorized quote preview persisted for audit. No Stripe checkout or
 * promotion activation is enabled here. Area signals are derived on the server.
 */
export const createPreviewQuote = mutation({
  args: {
    eventId: v.id("events"),
    placement: placementValidator,
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(ctx, args.eventId, "manage_marketing");
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const now = Date.now();
    if (!Number.isFinite(event.eventDate) || event.eventDate <= now || event.eventStatus === "cancelled")
      throw new Error("Only upcoming, active events can be boosted");
    if (args.durationDays === 0.5 && event.eventDate - now < 60 * 60 * 1000)
      throw new Error("Last-minute boosts require at least one hour before the event starts");
    // Quarter-hour increments prevent quoting more promotion time than is available.
    const effectiveDurationDays = args.durationDays === 0.5
      ? Math.min(12, Math.floor((event.eventDate - now) / (15 * 60 * 1000)) / 4) / 24
      : args.durationDays;
    const city = event.city?.trim().toLowerCase();
    const state = event.state?.trim().toLowerCase();
    if (!city || !state) throw new Error("Add an event city and state before requesting a boost");
    const areaKey = `${city},${state}`;
    // Existing events data supplies competition. This is a conservative provisional
    // market estimate, not actual placement reservations or impressions telemetry.
    const areaEvents = await ctx.db.query("events").withIndex("by_city", q => q.eq("city", event.city!)).take(500);
    const competingBoosts = areaEvents.filter(e =>
      e._id !== event._id &&
      e.state?.trim().toLowerCase() === state &&
      e.isPromoted === true &&
      (e.promotionEndsAt ?? 0) > now
    ).length;
    // Bounded seven-day event views and clicks in the target city/state.
    // If the area has insufficient observations, deriveAreaDemand uses a neutral fallback.
    const since = now - 7 * 86400000;
    const sampleEvents = areaEvents.filter(e => e.state?.trim().toLowerCase() === state).slice(0, 25);
    const samples = await Promise.all(sampleEvents.map(async e => {
      const [views, interactions] = await Promise.all([
        ctx.db.query("eventViews").withIndex("by_event_and_createdAt", q =>
          q.eq("eventId", e._id).gte("createdAt", since)).take(200),
        ctx.db.query("eventInteractions").withIndex("by_event_and_createdAt", q =>
          q.eq("eventId", String(e._id)).gte("createdAt", since)).take(200),
      ]);
      return { views: views.length,
        clicks: interactions.filter(i => i.type === "click" && i.createdAt >= since).length };
    }));
    const market = deriveAreaDemand({
      eligibleEventViews7d: samples.reduce((sum, item) => sum + item.views, 0),
      eligibleEventClicks7d: samples.reduce((sum, item) => sum + item.clicks, 0),
      activeCompetingBoosts: competingBoosts,
      availablePlacementSlots: ALLOCATED_SLOTS_PER_AREA,
    });
    const quote = buildBoostQuote({
      eventId: String(args.eventId),
      organizerId: identity.subject,
      areaKey,
      placement: args.placement,
      durationDays: effectiveDurationDays,
      now,
      market: {
        areaDemandIndex: market.areaDemandIndex,
        competingBoosts: market.competingBoosts,
        availableSlots: market.availableSlots,
        daysUntilEvent: Math.floor((event.eventDate - now) / 86400000),
      },
    });
    const quoteId = await ctx.db.insert("boostQuotes", {
      eventId: args.eventId,
      organizerId: identity.subject,
      areaKey: quote.areaKey,
      placement: quote.placement,
      durationDays: quote.durationDays,
      totalCents: quote.totalCents,
      currency: quote.currency,
      pricingVersion: quote.pricingVersion,
      marketDemandIndex: quote.marketSnapshot.areaDemandIndex,
      competingBoosts: quote.marketSnapshot.competingBoosts,
      availableSlots: quote.marketSnapshot.availableSlots,
      daysUntilEvent: quote.marketSnapshot.daysUntilEvent,
      calculatedAt: quote.calculatedAt,
      expiresAt: quote.expiresAt,
      status: "quoted",
    });
    return { quoteId, totalCents: quote.totalCents, durationHours: quote.durationDays * 24, currency: "usd" as const, expiresAt: quote.expiresAt, signalQuality: market.signalQuality, checkoutEnabled: process.env.BOOST_PAYMENTS_ENABLED === "true" };
  },
});

export const getMyPreviewQuote = query({
  args: { quoteId: v.id("boostQuotes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in");
    const quote = await ctx.db.get(args.quoteId);
    if (!quote || quote.organizerId !== identity.subject) return null;
    if (quote.status !== "quoted") return null;
    assertBoostQuoteEligible({
      eventId: String(quote.eventId), organizerId: quote.organizerId,
      areaKey: quote.areaKey, placement: quote.placement, durationDays: quote.durationDays,
      currency: quote.currency, totalCents: quote.totalCents,
      calculatedAt: quote.calculatedAt, expiresAt: quote.expiresAt,
      pricingVersion: "boost-v1",
      marketSnapshot: {
        areaDemandIndex: quote.marketDemandIndex, competingBoosts: quote.competingBoosts,
        availableSlots: quote.availableSlots, daysUntilEvent: quote.daysUntilEvent,
      },
    }, { eventId: String(quote.eventId), organizerId: identity.subject, now: Date.now(), expectedTotalCents: quote.totalCents });
    return { totalCents: quote.totalCents, currency: quote.currency, placement: quote.placement, durationDays: quote.durationDays, expiresAt: quote.expiresAt, checkoutEnabled: false };
  },
});


// Server-only checkout helpers. Never accept an amount from the browser.
export const getQuoteForCheckout = query({
  args: { serverSecret: v.string(), quoteId: v.id("boostQuotes"), clerkId: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_WEBHOOK_SHARED_SECRET || args.serverSecret !== process.env.STRIPE_WEBHOOK_SHARED_SECRET)
      throw new Error("Unauthorized server request");
    const quote = await ctx.db.get(args.quoteId);
    if (!quote || quote.organizerId !== args.clerkId || quote.status !== "quoted") return null;
    if (Date.now() >= quote.expiresAt) return null;
    const event = await ctx.db.get(quote.eventId);
    if (!event || event.eventDate <= Date.now() || event.eventStatus === "cancelled") return null;
    if (quote.durationDays <= 0.5 && event.eventDate - Date.now() < 30 * 60 * 1000) return null;
    return { quoteId: quote._id, eventId: quote.eventId, totalCents: quote.totalCents,
      placement: quote.placement, durationDays: quote.durationDays, expiresAt: quote.expiresAt };
  },
});

export const attachCheckoutSession = mutation({
  args: { serverSecret: v.string(), quoteId: v.id("boostQuotes"), clerkId: v.string(),
    stripeCheckoutSessionId: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_WEBHOOK_SHARED_SECRET || args.serverSecret !== process.env.STRIPE_WEBHOOK_SHARED_SECRET)
      throw new Error("Unauthorized server request");
    const quote = await ctx.db.get(args.quoteId);
    if (!quote || quote.organizerId !== args.clerkId || Date.now() >= quote.expiresAt)
      throw new Error("Invalid or expired quote");
    if (quote.status === "checkout_pending" && quote.stripeCheckoutSessionId === args.stripeCheckoutSessionId) return true;
    if (quote.status !== "quoted") throw new Error("Quote already used");
    await ctx.db.patch(quote._id, { status: "checkout_pending", stripeCheckoutSessionId: args.stripeCheckoutSessionId });
    return true;
  },
});

export const activatePaidBoost = mutation({
  args: { serverSecret: v.string(), quoteId: v.id("boostQuotes"),
    stripeCheckoutSessionId: v.string(), stripePaymentIntentId: v.optional(v.string()),
    amountTotal: v.number(), currency: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_WEBHOOK_SHARED_SECRET || args.serverSecret !== process.env.STRIPE_WEBHOOK_SHARED_SECRET)
      throw new Error("Unauthorized webhook");
    const quote = await ctx.db.get(args.quoteId);
    if (!quote || quote.stripeCheckoutSessionId !== args.stripeCheckoutSessionId)
      throw new Error("Unknown checkout session");
    if (quote.status === "paid") return true; // webhook idempotency
    if (quote.status !== "checkout_pending" || args.amountTotal !== quote.totalCents || args.currency !== "usd")
      throw new Error("Boost payment mismatch");
    const event = await ctx.db.get(quote.eventId);
    if (!event) throw new Error("Event missing");
    const now = Date.now();
    if (event.eventDate <= now || event.eventStatus === "cancelled") throw new Error("Event is no longer eligible for promotion");
    const weight = { discovery: 100, featured: 250, spotlight: 500 }[quote.placement];
    await ctx.db.insert("boostOrders", {
      eventId: quote.eventId, organizerId: quote.organizerId,
      tier: quote.placement, amount: quote.totalCents / 100, status: "paid",
      durationDays: quote.durationDays, featuredWeight: weight,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId, createdAt: now, updatedAt: now,
    });
    await ctx.db.patch(quote._id, { status: "paid", stripePaymentIntentId: args.stripePaymentIntentId, paidAt: now });
    await ctx.db.patch(quote.eventId, {
      isPromoted: true, promotionTier: quote.placement, featuredWeight: weight,
      promotionEndsAt: Math.min(event.eventDate, quote.durationDays <= 0.5
        ? now + quote.durationDays * 86400000
        : Math.max(now, event.promotionEndsAt ?? 0) + quote.durationDays * 86400000),
    });
    return true;
  },
});

export const recordBoostRefund = mutation({
  args: { serverSecret: v.string(), stripePaymentIntentId: v.string(), fullyRefunded: v.boolean() },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_WEBHOOK_SHARED_SECRET || args.serverSecret !== process.env.STRIPE_WEBHOOK_SHARED_SECRET)
      throw new Error("Unauthorized webhook");
    const order = await ctx.db.query("boostOrders").withIndex("by_payment_intent", q =>
      q.eq("stripePaymentIntentId", args.stripePaymentIntentId)).first();
    if (!order || !args.fullyRefunded || order.status === "refunded") return false;
    await ctx.db.patch(order._id, { status: "refunded", updatedAt: Date.now() });
    const quotes = await ctx.db.query("boostQuotes").withIndex("by_event", q => q.eq("eventId", order.eventId)).collect();
    const quote = quotes.find(q => q.stripePaymentIntentId === args.stripePaymentIntentId);
    if (quote) await ctx.db.patch(quote._id, { status: "refunded", refundedAt: Date.now() });
    const event = await ctx.db.get(order.eventId);
    const otherPaid = await ctx.db.query("boostOrders").withIndex("by_event", q =>
      q.eq("eventId", order.eventId)).collect();
    const newerPaidBoostExists = otherPaid.some(o => o._id !== order._id &&
      o.status === "paid" && (o.createdAt ?? 0) >= (order.createdAt ?? 0));
    if (event && !newerPaidBoostExists && event.promotionTier === order.tier) {
      await ctx.db.patch(order.eventId, { isPromoted: false, promotionEndsAt: undefined, featuredWeight: 0, promotionTier: undefined });
    }
    return true;
  },
});
