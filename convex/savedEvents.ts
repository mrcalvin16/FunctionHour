import { eventDisplayName } from "../lib/eventDisplayName";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getSavedEventIds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const saved = await ctx.db
      .query("savedEvents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return saved.map((item) => item.eventId);
  },
});

export const getSavedEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const saved = await ctx.db
      .query("savedEvents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const events = await Promise.all(
      saved.map(async (item) => {
        const event = await ctx.db.get(item.eventId);
        if (!event) return null;

        const imageUrl = event.imageStorageId
          ? await ctx.storage.getUrl(event.imageStorageId)
          : null;

        return {
          ...event,
          name: eventDisplayName(event),
          imageUrl,
          savedAt: item.createdAt,
        };
      })
    );

    return events.filter(Boolean);
  },
});

export const toggleSavedEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const existing = await ctx.db
      .query("savedEvents")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", identity.subject).eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    await ctx.db.insert("savedEvents", {
      userId: identity.subject,
      eventId: args.eventId,
      createdAt: Date.now(),
    });

    return { saved: true };
  },
});
