import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireEventCapability } from "./eventAccess";

const kind = v.union(v.literal("cancelled"), v.literal("postponed"), v.literal("rescheduled"), v.literal("venue_changed"));

export const changeEvent = mutation({
  args: {
    eventId: v.id("events"), kind, message: v.string(), showPublicAlert: v.optional(v.boolean()),
    nextDate: v.optional(v.number()), nextDateString: v.optional(v.string()),
    nextEndDate: v.optional(v.number()), nextEndDateString: v.optional(v.string()),
    nextVenue: v.optional(v.string()),
    nextVenueAddress: v.optional(v.string()), nextLocation: v.optional(v.string()),
    nextCity: v.optional(v.string()), nextState: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(ctx, args.eventId, "manage_event");
    const event = await ctx.db.get(args.eventId);
    if (!event || event.isDemo) throw new Error("Only real events can be changed here.");
    const message = args.message.trim();
    if (message.length < 15 || message.length > 1500) throw new Error("Explain the change in 15–1,500 characters.");
    if (event.eventStatus === "cancelled") throw new Error("A cancelled event cannot be reopened here. Contact Operations.");
    if (args.kind === "rescheduled" && (!Number.isFinite(args.nextDate) || args.nextDate! <= Date.now())) throw new Error("Choose a future event date.");
    if (args.kind === "rescheduled") {
      if (!args.nextDateString || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(args.nextDateString)) {
        throw new Error("Choose a valid start date and time.");
      }
      const nextEnd = args.nextEndDateString === ""
        ? undefined
        : args.nextEndDate ?? event.endDate;
      if (args.nextEndDateString !== undefined && args.nextEndDateString !== "" &&
          (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(args.nextEndDateString) ||
           !Number.isFinite(args.nextEndDate))) {
        throw new Error("Choose a valid end date and time.");
      }
      if (nextEnd !== undefined && nextEnd <= args.nextDate!) {
        throw new Error("End time must be after the start time.");
      }
      if (event.salesEndAt !== undefined && event.salesEndAt > args.nextDate!) {
        throw new Error("Move the ticket sales deadline before scheduling an earlier start.");
      }
      if (args.nextDate === event.eventDate &&
          nextEnd === event.endDate) {
        throw new Error("Choose a different start or end time.");
      }
    }
    if (args.kind === "venue_changed" && (!args.nextVenue?.trim() || args.nextVenue.trim().length > 200 || !args.nextCity?.trim() || !args.nextState?.trim() || !args.nextVenueAddress?.trim())) throw new Error("Enter the new venue name, address, city, and state.");
    if (args.kind === "postponed" && event.eventStatus === "postponed") throw new Error("The event is already postponed.");
    if (event.eventStatus === "postponed" && args.kind === "venue_changed") throw new Error("Reschedule the postponed event before changing its venue.");
    const changeId = await ctx.db.insert("eventChanges", {
      eventId: args.eventId, kind: args.kind, message, showPublicAlert: args.showPublicAlert ?? false,
      previousDate: event.eventDate, nextDate: args.nextDate,
      previousVenue: event.venueName, nextVenue: args.nextVenue?.trim(),
      createdBy: identity.subject, createdAt: Date.now(),
      queuedCount: 0, sentCount: 0, queueComplete: false,
    });
    await ctx.db.patch(args.eventId, {
      ...(args.kind === "cancelled" || args.kind === "postponed" ? { payoutHoldClearedAt: undefined, payoutHoldClearedBy: undefined, payoutHoldReviewNote: undefined } : {}),
      ...(args.kind === "cancelled" && { eventStatus: "cancelled" as const }),
      ...(args.kind === "postponed" && { eventStatus: "postponed" as const }),
      ...(args.kind === "rescheduled" && {
        eventStatus: "scheduled" as const,
        eventDate: args.nextDate!, dateString: args.nextDateString!,
        ...(args.nextEndDateString !== undefined && {
          endDateString: args.nextEndDateString,
          endDate: args.nextEndDateString === "" ? undefined : args.nextEndDate,
        }),
      }),
      ...(args.kind === "venue_changed" && { venueName: args.nextVenue!.trim(), venueAddress: args.nextVenueAddress!.trim(), city: args.nextCity!.trim(), state: args.nextState!.trim(), location: `${args.nextCity!.trim()}, ${args.nextState!.trim()}`, latitude: undefined, longitude: undefined }),
    });
    await ctx.scheduler.runAfter(0, internal.eventOperations.queueNotices, { changeId, phase: "orders", cursor: null });
    return changeId;
  },
});

const validEmail = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized : undefined;
};

// Legacy free tickets were issued with userId but without buyerEmail.
// Resolve the attendee's profile using the existing user indexes instead of
// silently treating a claimed ticket as an uncontactable buyer.
async function ticketNoticeEmail(ctx: MutationCtx, ticket: Doc<"tickets">) {
  const direct = validEmail(ticket.buyerEmail);
  if (direct) return direct;
  const owner = String(ticket.userId);
  const fromOwner = validEmail(owner);
  if (fromOwner) return fromOwner;
  const profileId = ctx.db.normalizeId("users", owner);
  const profile = profileId ? await ctx.db.get(profileId) : null;
  if (profile?.email) return validEmail(profile.email);
  const byClerk = await ctx.db.query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", owner)).first();
  if (byClerk?.email) return validEmail(byClerk.email);
  const byUser = await ctx.db.query("users")
    .withIndex("by_userId", (q) => q.eq("userId", owner)).first();
  return validEmail(byUser?.email);
}

export const queueNotices = internalMutation({
  args: { changeId: v.id("eventChanges"), phase: v.union(v.literal("orders"), v.literal("tickets")), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const change = await ctx.db.get(args.changeId);
    if (!change || change.queueComplete) return;
    const page = args.phase === "orders"
      ? await ctx.db.query("ticketOrders").withIndex("by_event_and_paidAt", (q) => q.eq("eventId", change.eventId)).paginate({ numItems: 40, cursor: args.cursor })
      : await ctx.db.query("tickets").withIndex("by_event", (q) => q.eq("eventId", change.eventId)).paginate({ numItems: 40, cursor: args.cursor });
    let added = 0;
    let unresolved = 0;
    for (const row of page.page) {
      if ("status" in row && (row.status === "refunded" || row.status === "cancelled" || row.status === "revoked")) continue;
      const email = args.phase === "tickets"
        ? await ticketNoticeEmail(ctx, row as Doc<"tickets">)
        : validEmail(row.buyerEmail);
      if (!email) {
        // Report missing contacts instead of showing a misleading 0 of 0.
        if (args.phase === "tickets") unresolved++;
        continue;
      }
      const exists = await ctx.db.query("eventChangeNotices").withIndex("by_changeId_and_email", (q) => q.eq("changeId", args.changeId).eq("email", email)).unique();
      if (!exists) {
        await ctx.db.insert("eventChangeNotices", { changeId: args.changeId, email, status: "pending", createdAt: Date.now() });
        added++;
      }
    }
    await ctx.db.patch(args.changeId, {
      queuedCount: change.queuedCount + added,
      unresolvedCount: (change.unresolvedCount ?? 0) + unresolved,
    });
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.eventOperations.queueNotices, { ...args, cursor: page.continueCursor });
    } else if (args.phase === "orders") {
      await ctx.scheduler.runAfter(0, internal.eventOperations.queueNotices, { changeId: args.changeId, phase: "tickets", cursor: null });
    } else {
      await ctx.db.patch(args.changeId, { queueComplete: true });
    }
  },
});

// Organizers may recheck previously issued free tickets after profile emails
// become available. Existing notices are deduplicated and never re-sent.
export const rebuildChangeNotices = mutation({
  args: { changeId: v.id("eventChanges") },
  handler: async (ctx, args) => {
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Event change not found.");
    await requireEventCapability(ctx, change.eventId, "manage_event");
    if (!change.queueComplete) {
      throw new Error("The attendee list is still being prepared. Try again shortly.");
    }
    await ctx.db.patch(change._id, { queueComplete: false, unresolvedCount: 0 });
    await ctx.scheduler.runAfter(0, internal.eventOperations.queueNotices, {
      changeId: change._id, phase: "orders", cursor: null,
    });
    return true;
  },
});

// Visibility controls only the public event-page alert; attendee emails and the
// immutable event-change audit are independent of this preference.
export const setPublicAlertVisibility = mutation({
  args: { changeId: v.id("eventChanges"), showPublicAlert: v.boolean() },
  handler: async (ctx, args) => {
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Event change not found.");
    await requireEventCapability(ctx, change.eventId, "manage_event");
    await ctx.db.patch(args.changeId, { showPublicAlert: args.showPublicAlert });
    return true;
  },
});

export const getChanges = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "manage_event");
    return ctx.db.query("eventChanges").withIndex("by_eventId_and_createdAt", (q) => q.eq("eventId", args.eventId)).order("desc").take(20);
  },
});

export const getPublicChanges = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return [];
    return (await ctx.db.query("eventChanges")
      .withIndex("by_eventId_and_createdAt", (q) => q.eq("eventId", args.eventId))
      .order("desc").take(1))
      .filter((change) => change.showPublicAlert !== false)
      .map(({ _id, kind, message, createdAt, nextDate, nextVenue }) => ({ _id, kind, message, createdAt, nextDate, nextVenue }));
  },
});

function assertServerSecret(secret: string) {
  if (!process.env.STRIPE_WEBHOOK_SHARED_SECRET || secret !== process.env.STRIPE_WEBHOOK_SHARED_SECRET) throw new Error("Unauthorized server request.");
}

export const getPendingNotices = query({
  args: { serverSecret: v.string(), changeId: v.id("eventChanges") },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const change = await ctx.db.get(args.changeId);
    if (!change) throw new Error("Change not found.");
    const event = await ctx.db.get(change.eventId);
    if (!event) throw new Error("Event not found.");
    const notices = await ctx.db.query("eventChangeNotices").withIndex("by_changeId_and_status", (q) => q.eq("changeId", args.changeId).eq("status", "pending")).take(10);
    return { change, eventName: event.name, eventId: event._id, notices };
  },
});

export const markNoticeSent = mutation({
  args: { serverSecret: v.string(), noticeId: v.id("eventChangeNotices") },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const notice = await ctx.db.get(args.noticeId);
    if (!notice || notice.status === "sent") return;
    const change = await ctx.db.get(notice.changeId);
    if (!change) throw new Error("Change not found.");
    await ctx.db.patch(args.noticeId, { status: "sent", sentAt: Date.now() });
    await ctx.db.patch(change._id, { sentCount: change.sentCount + 1 });
  },
});
