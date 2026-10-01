import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function assertServerSecret(secret: string) {
  const expected = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized server request.");
}

export const getConnectRecord = query({
  args: { serverSecret: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const user =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .first()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", args.clerkId))
        .first());
    return user ? { accountId: user.stripeConnectAccountId ?? null } : { accountId: null };
  },
});

export const getEventPayoutDestination = query({
  args: { serverSecret: v.string(), eventId: v.id("events") },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return {
        accountId: null,
        organizerId: null,
        reason: "event_not_found" as const,
      };
    }

    const organizerId = event.organizerId ?? event.userId;
    const organizer =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", organizerId))
        .first()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", organizerId))
        .first());

    return {
      accountId: organizer?.stripeConnectAccountId ?? null,
      organizerId,
      reason: organizer?.stripeConnectAccountId
        ? ("ready" as const)
        : ("not_connected" as const),
    };
  },
});

export const saveConnectAccount = mutation({
  args: {
    serverSecret: v.string(),
    clerkId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    email: v.string(),
    name: v.optional(v.string()),
    accountId: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const existing =
      (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
        .first()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_userId", (q) => q.eq("userId", args.clerkId))
        .first());
    const patch = {
      clerkId: args.clerkId,
      userId: args.clerkId,
      tokenIdentifier: args.tokenIdentifier,
      email: args.email.trim().toLowerCase(),
      name: args.name?.trim(),
      stripeConnectAccountId: args.accountId,
      stripeConnectCreatedAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("users", {
      ...patch,
      createdAt: Date.now(),
      role: "organizer",
      isOrganizer: true,
      onboardingComplete: false,
      attendeeOnboardingComplete: false,
      verificationRequested: false,
      isVerifiedOrganizer: false,
    });
  },
});


export const getOrganizerPayoutSummary = query({
  args: { serverSecret: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", args.clerkId))
      .take(101);
    if (events.length > 100) {
      throw new Error("Payout history is too large for automatic reconciliation.");
    }

    let earned = 0;
    let orderCount = 0;
    let openDisputeCount = 0;
    for (const event of events) {
      for await (const order of ctx.db
        .query("ticketOrders")
        .withIndex("by_event_and_paidAt", (q) => q.eq("eventId", event._id))) {
        orderCount += 1;
        if (order.disputeStatus === "open") openDisputeCount += 1;
        if (orderCount > 20_000) {
          throw new Error("Payout history is too large for automatic reconciliation.");
        }
        earned += order.netAmount;
      }
    }

    const requests = await ctx.db
      .query("organizerPayoutRequests")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.clerkId))
      .take(10_001);
    if (requests.length > 10_000) {
      throw new Error("Payout history is too large for automatic reconciliation.");
    }
    const requested = requests
      .filter((item) => item.status !== "rejected")
      .reduce((sum, item) => sum + item.amount, 0);
    const pendingRequest = requests
      .filter((item) => item.status === "requested" || item.status === "processing")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return {
      earnedAmount: Math.round(earned * 100) / 100,
      openDisputeCount,
      transferredAmount: Math.round(
        requests
          .filter((item) => item.status === "transferred")
          .reduce((sum, item) => sum + item.amount, 0) * 100,
      ) / 100,
      requestedAmount: Math.round(requested * 100) / 100,
      requestableAmount: Math.max(0, Math.round((earned - requested) * 100) / 100),
      pendingRequest: pendingRequest
        ? { amount: pendingRequest.amount, createdAt: pendingRequest.createdAt }
        : null,
    };
  },
});

export const createOrganizerPayoutRequest = mutation({
  args: {
    serverSecret: v.string(),
    clerkId: v.string(),
    stripeAccountId: v.string(),
    requestedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const requests = await ctx.db
      .query("organizerPayoutRequests")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.clerkId))
      .take(10_001);
    if (requests.length > 10_000) {
      throw new Error("Payout history is too large for automatic reconciliation.");
    }
    const inFlight = requests
      .filter((item) => item.status === "requested" || item.status === "processing")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (inFlight) return { requestId: inFlight._id, amount: inFlight.amount };

    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", args.clerkId))
      .take(101);
    if (events.length > 100) {
      throw new Error("Payout history is too large for automatic reconciliation.");
    }

    let earned = 0;
    let orderCount = 0;
    for (const event of events) {
      for await (const order of ctx.db
        .query("ticketOrders")
        .withIndex("by_event_and_paidAt", (q) => q.eq("eventId", event._id))) {
        orderCount += 1;
        if (orderCount > 20_000) {
          throw new Error("Payout history is too large for automatic reconciliation.");
        }
        earned += order.netAmount;
      }
    }

    const alreadyReserved = requests
      .filter((item) => item.status !== "rejected")
      .reduce((sum, item) => sum + item.amount, 0);
    const amount = Math.max(
      0,
      Math.floor(Math.min(args.requestedAmount, earned - alreadyReserved + Number.EPSILON) * 100) / 100,
    );
    if (amount <= 0) throw new Error("There are no eligible ticket funds to request.");

    const now = Date.now();
    const requestId = await ctx.db.insert("organizerPayoutRequests", {
      organizerId: args.clerkId,
      stripeAccountId: args.stripeAccountId,
      amount,
      currency: "usd",
      status: "requested",
      createdAt: now,
      updatedAt: now,
    });
    return { requestId, amount };
  },
});

export const getPendingPayoutRequests = query({
  args: { serverSecret: v.string() },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const requested = await ctx.db.query("organizerPayoutRequests")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "requested"))
      .order("desc").take(500);
    const processing = await ctx.db.query("organizerPayoutRequests")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "processing"))
      .order("desc").take(500);
    return [...requested, ...processing].sort((a, b) => b.createdAt - a.createdAt).slice(0, 500).map((request) => ({
      requestId: request._id,
      status: request.status,
      organizerId: request.organizerId,
      stripeAccountId: request.stripeAccountId,
      amount: request.amount,
      createdAt: request.createdAt,
    }));
  },
});

export const beginOrganizerPayoutTransfer = mutation({
  args: {
    serverSecret: v.string(), requestId: v.id("organizerPayoutRequests"), reviewedBy: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "requested") throw new Error("Payout request is not pending approval.");
    await ctx.db.patch(args.requestId, {
      status: "processing", reviewedBy: args.reviewedBy, updatedAt: Date.now(),
    });
    return true;
  },
});

export const getPayoutRequestForReview = query({
  args: { serverSecret: v.string(), requestId: v.id("organizerPayoutRequests") },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Payout request not found.");
    return request;
  },
});

export const rejectOrganizerPayoutRequest = mutation({
  args: {
    serverSecret: v.string(),
    requestId: v.id("organizerPayoutRequests"),
    reviewedBy: v.string(),
    reviewNote: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "requested") {
      throw new Error("Only pending requests may be rejected.");
    }
    await ctx.db.patch(args.requestId, {
      status: "rejected", reviewedBy: args.reviewedBy,
      reviewNote: args.reviewNote.slice(0, 500), updatedAt: Date.now(),
    });
    return true;
  },
});

export const markOrganizerPayoutTransferred = mutation({
  args: {
    serverSecret: v.string(),
    requestId: v.id("organizerPayoutRequests"),
    stripeTransferId: v.string(),
    reviewedBy: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Payout request not found.");
    if (request.status === "transferred") {
      if (request.stripeTransferId !== args.stripeTransferId) {
        throw new Error("Payout request was already reconciled to another transfer.");
      }
      return true;
    }
    if (request.status !== "processing") throw new Error("Payout request is not processing.");
    await ctx.db.patch(args.requestId, {
      status: "transferred",
      stripeTransferId: args.stripeTransferId,
      reviewedBy: args.reviewedBy,
      updatedAt: Date.now(),
    });
    return true;
  },
});
