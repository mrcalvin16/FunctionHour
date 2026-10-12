import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { eventTaxLocationKey } from "../lib/ticketTax";

// Organizer tax is passed through in the organizer's proceeds. The platform
// may override it when its own collection duty applies at this venue.
export const setOrganizerTaxPolicy = mutation({
  args: {
    serverSecret: v.string(), eventId: v.id("events"), organizerUserId: v.string(),
    taxRateId: v.string(), ratePercentage: v.number(), venuePostalCode: v.string(),
    basis: v.string(), taxAddOns: v.boolean(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret || args.serverSecret !== secret) throw new Error("Unauthorized tax settings.");
    const event = await ctx.db.get(args.eventId);
    if (!event || event.isDemo || (event.userId !== args.organizerUserId && event.organizerId !== args.organizerUserId)) {
      throw new Error("Event owner not found.");
    }
    if (event.taxPolicy?.collector === "platform" || (event.taxPolicy && !event.taxPolicy.collector)) {
      throw new Error("Function Hour collects tax for this event.");
    }
    if (!event.venueAddress?.trim() || !event.city?.trim() || !event.state?.trim()) {
      throw new Error("Complete the venue address before configuring tax.");
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(args.venuePostalCode) ||
        !/^txr_[A-Za-z0-9]+$/.test(args.taxRateId) || !Number.isFinite(args.ratePercentage) ||
        args.ratePercentage < 0 || args.ratePercentage > 25 ||
        !args.basis.trim() || args.basis.length > 500) {
      throw new Error("Invalid organizer tax settings.");
    }
    await ctx.db.patch(args.eventId, { taxPolicy: {
      mode: "collect", collector: "organizer", taxRateId: args.taxRateId,
      addOnTaxRateId: args.taxAddOns ? args.taxRateId : undefined,
      ratePercentage: args.ratePercentage, venuePostalCode: args.venuePostalCode,
      locationKey: eventTaxLocationKey(event), reason: args.basis.trim(),
      reviewedBy: args.organizerUserId, reviewedAt: Date.now(),
    } });
  },
});

export const removeOrganizerTaxPolicy = mutation({
  args: { serverSecret: v.string(), eventId: v.id("events"), organizerUserId: v.string() },
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret || args.serverSecret !== secret) throw new Error("Unauthorized tax settings.");
    const event = await ctx.db.get(args.eventId);
    if (!event || (event.userId !== args.organizerUserId && event.organizerId !== args.organizerUserId)) {
      throw new Error("Event owner not found.");
    }
    if (event.taxPolicy?.collector !== "organizer") throw new Error("No organizer tax policy to remove.");
    await ctx.db.patch(args.eventId, { taxPolicy: undefined });
  },
});

// Only the Operations API can call this with the server-side secret. Organizer
// event edits never authorize a tax exemption or a tax rate.
export const setEventTaxPolicy = mutation({
  args: {
    serverSecret: v.string(),
    eventId: v.id("events"),
    mode: v.union(v.literal("collect"), v.literal("exempt")),
    taxRateId: v.optional(v.string()),
    serviceFeeTaxRateId: v.optional(v.string()),
    addOnTaxRateId: v.optional(v.string()),
    ratePercentage: v.optional(v.number()),
    venuePostalCode: v.string(),
    reason: v.string(),
    reviewedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret || args.serverSecret !== secret) throw new Error("Unauthorized tax review.");
    const event = await ctx.db.get(args.eventId);
    if (!event || event.isDemo) throw new Error("Event not found.");
    if (!event.venueAddress?.trim() || !event.city?.trim() || !event.state?.trim()) {
      throw new Error("Complete the venue address, city, and state before tax review.");
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(args.venuePostalCode)) {
      throw new Error("A US venue ZIP code is required.");
    }
    if (!args.reason.trim() || args.reason.length > 500) {
      throw new Error("Record the reviewed tax basis or exemption reason.");
    }
    if (args.mode === "collect" && (!args.taxRateId || !/^txr_[A-Za-z0-9]+$/.test(args.taxRateId) ||
        args.ratePercentage === undefined || !Number.isFinite(args.ratePercentage) ||
        args.ratePercentage < 0 || args.ratePercentage > 25)) {
      throw new Error("A reviewed Stripe tax rate is required.");
    }
    if ([args.serviceFeeTaxRateId, args.addOnTaxRateId].some((id) => id && !/^txr_[A-Za-z0-9]+$/.test(id))) {
      throw new Error("Invalid fee or add-on tax rate.");
    }
    await ctx.db.patch(args.eventId, {
      taxPolicy: {
        mode: args.mode,
        collector: "platform",
        taxRateId: args.mode === "collect" ? args.taxRateId : undefined,
        serviceFeeTaxRateId: args.mode === "collect" ? args.serviceFeeTaxRateId : undefined,
        addOnTaxRateId: args.mode === "collect" ? args.addOnTaxRateId : undefined,
        ratePercentage: args.mode === "collect" ? args.ratePercentage : undefined,
        venuePostalCode: args.venuePostalCode,
        locationKey: eventTaxLocationKey(event),
        reason: args.reason.trim(),
        reviewedBy: args.reviewedBy,
        reviewedAt: Date.now(),
      },
    });
  },
});
