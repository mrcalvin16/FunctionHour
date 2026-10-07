import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEventCapability } from "./eventAccess";

const category = v.union(v.literal("scan_failed"), v.literal("pass_missing"), v.literal("duplicate"), v.literal("offline"), v.literal("other"));

export const list = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await requireEventCapability(ctx, eventId, "check_in");
    return ctx.db.query("gateIssues").withIndex("by_eventId_and_createdAt", (q) => q.eq("eventId", eventId)).order("desc").take(50);
  },
});

export const report = mutation({
  args: { eventId: v.id("events"), category, note: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(ctx, args.eventId, "check_in");
    const note = args.note.trim();
    if (note.length < 8 || note.length > 500) throw new Error("Add a short issue note (8–500 characters). Avoid card numbers or passwords.");
    return ctx.db.insert("gateIssues", {
      eventId: args.eventId, category: args.category, note,
      status: "open", reportedBy: identity.subject, createdAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: { issueId: v.id("gateIssues") },
  handler: async (ctx, { issueId }) => {
    const issue = await ctx.db.get(issueId);
    if (!issue) throw new Error("Issue not found.");
    const { identity } = await requireEventCapability(ctx, issue.eventId, "check_in");
    if (issue.status === "resolved") return;
    await ctx.db.patch(issueId, { status: "resolved", resolvedAt: Date.now(), resolvedBy: identity.subject });
  },
});
