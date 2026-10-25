import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEventCapability } from "./eventAccess";

export const list = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.demoHidden === true) return [];
    const performers = await ctx.db.query("eventTalent").withIndex("by_event", q => q.eq("eventId", eventId)).collect();
    return performers.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  },
});

export const add = mutation({
  args: {
    eventId: v.id("events"), name: v.string(), role: v.string(),
    bio: v.optional(v.string()), instagram: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "manage_event");
    const name = args.name.trim(), role = args.role.trim();
    if (!name || name.length > 100 || !role || role.length > 60 || (args.bio?.length ?? 0) > 400) throw new Error("Invalid performer details.");
    const instagram = args.instagram?.trim().replace(/^@/, "");
    if (instagram && !/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) throw new Error("Enter an Instagram username, not a URL.");
    const existing = await ctx.db.query("eventTalent").withIndex("by_event", q => q.eq("eventId", args.eventId)).collect();
    if (existing.length >= 30) throw new Error("Maximum 30 performers per event.");
    return ctx.db.insert("eventTalent", { eventId: args.eventId, name, role, bio: args.bio?.trim(), instagram, sortOrder: existing.length, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { performerId: v.id("eventTalent") },
  handler: async (ctx, { performerId }) => {
    const performer = await ctx.db.get(performerId);
    if (!performer) return;
    await requireEventCapability(ctx, performer.eventId, "manage_event");
    await ctx.db.delete(performerId);
  },
});
