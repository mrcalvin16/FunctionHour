import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getPlan = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const event = await ctx.db.get(eventId);
    if (!event || (event.userId !== identity.subject && event.organizerId !== identity.subject)) return null;
    return ctx.db.query("budgetPlans").withIndex("by_event_user", q => q.eq("eventId", eventId).eq("userId", identity.subject)).unique();
  },
});

export const savePlan = mutation({
  args: { eventId: v.id("events"), ticketPrice: v.number(), expectedTickets: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in.");
    const event = await ctx.db.get(args.eventId);
    if (!event || (event.userId !== identity.subject && event.organizerId !== identity.subject)) throw new Error("You cannot manage this event budget.");
    if (!Number.isFinite(args.ticketPrice) || args.ticketPrice < 0 || args.ticketPrice > 1000000 || !Number.isSafeInteger(args.expectedTickets) || args.expectedTickets < 0 || args.expectedTickets > 1000000) throw new Error("Enter a valid ticket price and whole ticket count.");
    const existing = await ctx.db.query("budgetPlans").withIndex("by_event_user", q => q.eq("eventId", args.eventId).eq("userId", identity.subject)).unique();
    const values = { ticketPrice: args.ticketPrice, expectedTickets: args.expectedTickets, updatedAt: Date.now() };
    if (existing) { await ctx.db.patch(existing._id, values); return existing._id; }
    return ctx.db.insert("budgetPlans", { ...values, eventId: args.eventId, userId: identity.subject });
  },
});

export const getItems = query({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("budgetItems")
      .withIndex("by_event_user", (q) =>
        q
          .eq("eventId", args.eventId)
          .eq("userId", identity.subject)
      )
      .order("desc")
      .collect();
  },
});

export const addItem = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    name: v.string(),
    amount: v.number(),
    type: v.union(
      v.literal("expense"),
      v.literal("income")
    ),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    if (identity.subject !== args.userId) {
      throw new Error(
        "You cannot add budget items for another user."
      );
    }

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    if (
      event.userId !== identity.subject &&
      event.organizerId !== identity.subject
    ) {
      throw new Error(
        "You do not have permission to manage this budget."
      );
    }

    const name = args.name.trim();
    const notes = args.notes?.trim();

    if (!name) {
      throw new Error("A budget item name is required.");
    }

    if (!Number.isFinite(args.amount) || args.amount < 0) {
      throw new Error(
        "Budget amount must be a valid positive number."
      );
    }

    return await ctx.db.insert("budgetItems", {
      eventId: args.eventId,
      userId: identity.subject,
      name,
      amount: args.amount,
      type: args.type,
      notes: notes || undefined,
      createdAt: Date.now(),
    });
  },
});

export const deleteItem = mutation({
  args: {
    itemId: v.id("budgetItems"),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const item = await ctx.db.get(args.itemId);

    if (!item) {
      throw new Error("Budget item not found.");
    }

    if (item.userId !== identity.subject) {
      throw new Error(
        "You do not have permission to delete this item."
      );
    }

    await ctx.db.delete(args.itemId);

    return true;
  },
});
