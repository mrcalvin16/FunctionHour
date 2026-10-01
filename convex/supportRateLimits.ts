import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";

export const consume = mutation({
  args: {
    serverSecret: v.string(), key: v.string(), limit: v.number(), windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!expected || args.serverSecret !== expected) throw new Error("Unauthorized rate limit request.");
    if (args.key.length > 160 || args.limit < 1 || args.limit > 100 ||
        args.windowMs < 1_000 || args.windowMs > 3_600_000) throw new Error("Invalid rate limit.");
    const now = Date.now();
    const existing = await ctx.db.query("supportRateBuckets")
      .withIndex("by_key", (q) => q.eq("key", args.key)).unique();
    if (!existing) {
      const id = await ctx.db.insert("supportRateBuckets", {
        key: args.key, count: 1, resetAt: now + args.windowMs,
      });
      await ctx.scheduler.runAfter(args.windowMs + 60_000, internal.supportRateLimits.clearBucket, { id });
      return { allowed: true, remaining: args.limit - 1, retryAfterSeconds: Math.ceil(args.windowMs / 1000) };
    }
    if (existing.resetAt <= now) {
      await ctx.db.patch(existing._id, { count: 1, resetAt: now + args.windowMs });
      await ctx.scheduler.runAfter(args.windowMs + 60_000, internal.supportRateLimits.clearBucket, { id: existing._id });
      return { allowed: true, remaining: args.limit - 1, retryAfterSeconds: Math.ceil(args.windowMs / 1000) };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    if (existing.count >= args.limit) return { allowed: false, remaining: 0, retryAfterSeconds };
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true, remaining: args.limit - existing.count - 1, retryAfterSeconds };
  },
});

export const clearBucket = internalMutation({
  args: { id: v.id("supportRateBuckets") },
  handler: async (ctx, args) => {
    const bucket = await ctx.db.get(args.id);
    if (bucket && bucket.resetAt <= Date.now()) await ctx.db.delete(args.id);
  },
});
