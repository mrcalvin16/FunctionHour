import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const category = v.union(
  v.literal("ticket_help"), v.literal("refund"), v.literal("report_event"),
  v.literal("payment"), v.literal("merch"), v.literal("account"), v.literal("other"),
);

export const create = internalMutation({
  args: {
    category, email: v.string(), name: v.optional(v.string()), message: v.string(),
    eventUrl: v.optional(v.string()), pagePath: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.email.length > 254 || args.message.length > 2000 || args.message.length < 10 ||
        args.name?.length && args.name.length > 100 || args.eventUrl?.length && args.eventUrl.length > 400 ||
        args.pagePath.length > 300) throw new Error("Invalid support request.");
    const now = Date.now();
    return ctx.db.insert("supportRequests", {
      ...args, status: "new", notificationStatus: "pending", createdAt: now, updatedAt: now,
    });
  },
});

export const listRecent = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("supportRequests")
    .withIndex("by_createdAt").order("desc").take(100),
});

export const setStatus = internalMutation({
  args: {
    id: v.id("supportRequests"),
    status: v.union(v.literal("new"), v.literal("in_progress"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Support request not found.");
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
  },
});

export const setNotificationStatus = internalMutation({
  args: {
    id: v.id("supportRequests"),
    status: v.union(v.literal("delivered"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    if (!await ctx.db.get(args.id)) return;
    await ctx.db.patch(args.id, { notificationStatus: args.status, updatedAt: Date.now() });
  },
});
