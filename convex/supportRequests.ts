import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const category = v.union(
  v.literal("ticket_help"), v.literal("refund"), v.literal("report_event"),
  v.literal("payment"), v.literal("merch"), v.literal("account"), v.literal("other"),
);

export const create = internalMutation({
  args: {
    category, email: v.string(), name: v.optional(v.string()), message: v.string(),
    eventUrl: v.optional(v.string()), pagePath: v.string(), statusTokenHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.email.length > 254 || args.message.length > 2000 || args.message.length < 10 ||
        args.name?.length && args.name.length > 100 || args.eventUrl?.length && args.eventUrl.length > 400 ||
        args.pagePath.length > 300 || args.statusTokenHash && !/^[a-f0-9]{64}$/.test(args.statusTokenHash)) throw new Error("Invalid support request.");
    const now = Date.now();
    return ctx.db.insert("supportRequests", {
      ...args, status: "new", notificationStatus: "pending", createdAt: now, updatedAt: now,
    });
  },
});

export const getCustomerStatus = internalQuery({
  args: { id: v.id("supportRequests"), statusTokenHash: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item?.statusTokenHash || item.statusTokenHash !== args.statusTokenHash) return null;
    // Only disclose operational status. Notes, messages, email and operator IDs are private.
    return { status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt,
      followUpAt: item.followUpAt };
  },
});

export const listRecent = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("supportRequests")
    .withIndex("by_createdAt").order("desc").take(100),
});

export const getActivity = internalQuery({
  args: { id: v.id("supportRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Support request not found.");
    const activity = await ctx.db.query("supportCaseActivity")
      .withIndex("by_requestId_and_createdAt", (q) => q.eq("requestId", args.id))
      .order("desc").take(100);
    return { request, activity };
  },
});

export const updateCase = internalMutation({
  args: {
    id: v.id("supportRequests"), actorId: v.string(),
    action: v.union(v.literal("claim"), v.literal("release"), v.literal("priority"),
      v.literal("status"), v.literal("note"), v.literal("follow_up"), v.literal("reply_recorded")),
    status: v.optional(v.union(v.literal("new"), v.literal("in_progress"), v.literal("waiting_on_organizer"), v.literal("resolved"))),
    priority: v.optional(v.union(v.literal("standard"), v.literal("urgent"))),
    note: v.optional(v.string()), followUpAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.actorId.startsWith("user_") || args.actorId.length > 100) throw new Error("Invalid case actor.");
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Support request not found.");
    const now = Date.now();
    let detail: string;
    const patch: { assignedTo?: string | undefined; priority?: "standard" | "urgent";
      status?: "new" | "in_progress" | "waiting_on_organizer" | "resolved"; followUpAt?: number | undefined;
      lastReplyAt?: number; updatedAt: number } = { updatedAt: now };
    switch (args.action) {
      case "claim":
        if (item.assignedTo && item.assignedTo !== args.actorId) throw new Error("Case is owned by another operator.");
        if (item.assignedTo === args.actorId) return;
        patch.assignedTo = args.actorId;
        if (item.status === "new") patch.status = "in_progress";
        detail = "Claimed case";
        break;
      case "release":
        if (item.assignedTo !== args.actorId) throw new Error("Only the case owner can release it.");
        patch.assignedTo = undefined;
        detail = "Released case";
        break;
      case "priority":
        if (!args.priority) throw new Error("Priority is required.");
        patch.priority = args.priority;
        detail = `Priority set to ${args.priority}`;
        break;
      case "status":
        if (!args.status) throw new Error("Status is required.");
        if (args.status === "resolved" && !args.note?.trim()) throw new Error("Add a resolution note before closing this case.");
        patch.status = args.status;
        detail = args.status === "resolved" ? `Resolved: ${args.note!.trim()}` : `Status set to ${args.status}`;
        break;
      case "note":
        if (!args.note?.trim()) throw new Error("Internal note is required.");
        detail = args.note.trim();
        break;
      case "follow_up":
        if (args.followUpAt !== undefined && (!Number.isSafeInteger(args.followUpAt) ||
          args.followUpAt < now - 60_000 || args.followUpAt > now + 365 * 24 * 60 * 60_000)) {
          throw new Error("Follow-up must be within the next year.");
        }
        patch.followUpAt = args.followUpAt;
        detail = args.followUpAt ? `Follow-up set for ${new Date(args.followUpAt).toISOString()}` : "Follow-up cleared";
        break;
      case "reply_recorded":
        patch.lastReplyAt = now;
        detail = "Operator recorded a customer reply sent outside the app";
        break;
    }
    if (detail.length > 1000) throw new Error("Case note is too long.");
    await ctx.db.patch(args.id, patch);
    await ctx.db.insert("supportCaseActivity", { requestId: args.id, actorId: args.actorId,
      action: args.action, detail, createdAt: now });
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
