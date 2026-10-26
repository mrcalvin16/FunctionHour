import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEventCapability } from "./eventAccess";
import { buildBoostQuote, assertBoostQuoteEligible } from "../lib/boostQuoteGuardrails";
import { deriveAreaDemand } from "../lib/boostMarketSignals";

const placementValidator = v.union(v.literal("discovery"), v.literal("featured"), v.literal("spotlight"));
const ALLOCATED_SLOTS_PER_AREA = 5; // provisional inventory policy; checkout remains disabled

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
    const market = deriveAreaDemand({
      eligibleEventViews7d: 0,
      eligibleEventClicks7d: 0,
      activeCompetingBoosts: competingBoosts,
      availablePlacementSlots: ALLOCATED_SLOTS_PER_AREA,
    });
    const quote = buildBoostQuote({
      eventId: String(args.eventId),
      organizerId: identity.subject,
      areaKey,
      placement: args.placement,
      durationDays: args.durationDays,
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
    return { quoteId, totalCents: quote.totalCents, currency: "usd" as const, expiresAt: quote.expiresAt, signalQuality: market.signalQuality, checkoutEnabled: false };
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
