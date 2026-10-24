import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireServer(secret: string) {
  const expected = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!expected || secret !== expected) throw new Error("Unauthorized.");
}
export const recordCta = mutation({
  args: { serverSecret: v.string(), cta: v.string(), path: v.string() },
  handler: async (ctx, args) => {
    requireServer(args.serverSecret);
    if (!["create_event", "get_tickets", "ticket_checkout", "merch_checkout", "sign_in", "sign_up", "browse_events"].includes(args.cta) || args.path.length > 160 || !args.path.startsWith("/")) throw new Error("Invalid activity.");
    await ctx.db.insert("ctaActivity", { cta: args.cta, path: args.path, createdAt: Date.now() });
  },
});
export const overview = query({
  args: { serverSecret: v.string(), days: v.number() },
  handler: async (ctx, args) => {
    requireServer(args.serverSecret);
    if (![1, 7, 30].includes(args.days)) throw new Error("Invalid date range.");
    const since = Date.now() - args.days * 86400000;
    const users = await ctx.db.query("users").order("desc").take(2001);
    const recent = users.filter((user) => user._creationTime >= since).slice(0, 2000);
    const clicks = await ctx.db.query("ctaActivity").withIndex("by_createdAt", (q) => q.gte("createdAt", since)).order("desc").take(2001);
    const counts: Record<string, number> = {};
    for (const click of clicks.slice(0, 2000)) counts[click.cta] = (counts[click.cta] ?? 0) + 1;
    return {
      registrations: recent.length, organizers: recent.filter((user) => user.isOrganizer).length,
      onboardingCompleted: recent.filter((user) => user.attendeeOnboardingComplete || user.onboardingComplete).length,
      usersLimited: users.length > 2000 && users[2000]._creationTime >= since, clicksLimited: clicks.length > 2000,
      users: recent.slice(0, 100).map((user) => ({ id: user._id, name: user.name || user.organizerName || "New member", email: user.email || "", registeredAt: user._creationTime, organizer: user.isOrganizer === true, onboarded: Boolean(user.attendeeOnboardingComplete || user.onboardingComplete) })),
      counts, recentClicks: clicks.slice(0, 30).map((click) => ({ id: click._id, cta: click.cta, path: click.path, createdAt: click.createdAt })),
    };
  },
});

export const recordVisit = mutation({
  args: { serverSecret: v.string(), sessionId: v.string(), path: v.string() },
  handler: async (ctx, args) => {
    requireServer(args.serverSecret);
    if (!/^[a-f0-9-]{36}$/.test(args.sessionId) || !/^\/[a-zA-Z0-9/_:-]*$/.test(args.path) || args.path.length > 160) throw new Error("Invalid visit");
    const now = Date.now();
    const existing = await ctx.db.query("visitorSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)).first();
    if (existing) {
      if (now - existing.lastSeenAt < 10000) return;
      await ctx.db.patch(existing._id, { lastSeenAt: now, pageViews: existing.pageViews + 1 });
    } else {
      await ctx.db.insert("visitorSessions", { sessionId: args.sessionId, firstSeenAt: now, lastSeenAt: now, pageViews: 1, firstPath: args.path });
    }
  },
});
export const launchOverview = query({
  args: { serverSecret: v.string(), days: v.number() },
  handler: async (ctx, args) => {
    requireServer(args.serverSecret);
    if (![1, 7, 30].includes(args.days)) throw new Error("Invalid period");
    const now = Date.now(), since = now - args.days * 86400000;
    const visits = await ctx.db.query("visitorSessions").withIndex("by_firstSeenAt", q => q.gte("firstSeenAt", since)).order("desc").take(5001);
    const recentUsers = await ctx.db.query("users").order("desc").take(5001);
    const registrations = recentUsers.filter(u => u._creationTime >= since);
    const cases = await ctx.db.query("supportRequests").withIndex("by_createdAt", q => q.gte("createdAt", since)).order("desc").take(1001);
    const negative = cases.filter(item => ["refund", "payment", "report_event", "ticket_help"].includes(item.category) || item.priority === "urgent" || (item.category === "other" && item.message.startsWith("[Product Feedback] [negative]")));
    const buckets = Array.from({ length: args.days }, (_, i) => {
      const key = new Date(since + i * 86400000).toISOString().slice(0, 10);
      return { date: key, visits: 0, signups: 0 };
    });
    const daily = new Map(buckets.map(b => [b.date, b]));
    for (const visit of visits.slice(0, 5000)) {
      const bucket = daily.get(new Date(visit.firstSeenAt).toISOString().slice(0, 10));
      if (bucket) bucket.visits++;
    }
    for (const user of registrations) {
      const bucket = daily.get(new Date(user._creationTime).toISOString().slice(0, 10));
      if (bucket) bucket.signups++;
    }
    const ctas = await ctx.db.query("ctaActivity").withIndex("by_createdAt", q => q.gte("createdAt", since)).order("desc").take(5001);
    const eventRecords = await ctx.db.query("events").order("desc").take(5001);
    const recentEvents = eventRecords.filter(e => (e.createdAt ?? e._creationTime) >= since && !e.isDemo && !e.demoHidden);
    const orders = await ctx.db.query("ticketOrders").order("desc").take(5001);
    const paidOrders = orders.filter(order => order.paidAt >= since && order.status === "paid");
    const countCta = (key: string) => ctas.filter(click => click.cta === key).length;
    const feedback = cases.filter(item => item.category === "other" && item.message.startsWith("[Product Feedback]"));
    const organizerIds = new Set(recentEvents.map(event => event.userId));
    const funnel = {
      browseClicks: countCta("browse_events"),
      signupClicks: countCta("sign_up"),
      createEventClicks: countCta("create_event"),
      ticketClicks: countCta("get_tickets") + countCta("ticket_checkout"),
      checkoutOrders: paidOrders.length,
      createdEvents: recentEvents.length,
      publishedEvents: recentEvents.length, // Legacy field; this is a creation count, not verified publication.
      publishingOrganizers: organizerIds.size,
    };
    return {
      recentCreatedEvents: recentEvents.slice(0, 20).map(event => ({
        id: event._id, name: event.name, city: event.city || "", state: event.state || "",
        createdAt: event.createdAt ?? event._creationTime,
      })),
      eventsByCity: Object.entries(recentEvents.reduce<Record<string, number>>((counts, event) => {
        const city = [event.city, event.state].filter(Boolean).join(", ") || "Unspecified";
        counts[city] = (counts[city] ?? 0) + 1;
        return counts;
      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, count]) => ({ city, count })),
      funnel, productFeedback: feedback.slice(0, 15).map(item => ({ id: item._id, message: item.message.slice(0, 300), status: item.status, createdAt: item.createdAt })),
      sessionEstimate: Math.min(visits.length, 5000), pageViews: visits.slice(0, 5000).reduce((n, v) => n + v.pageViews, 0),
      activeSessions30m: visits.filter(v => v.lastSeenAt >= now - 1800000).length,
      registrations: registrations.length, organizers: registrations.filter(u => u.isOrganizer).length,
      supportRequests: cases.length, negativeSignals: negative.length,
      unresolvedNegative: negative.filter(item => item.status !== "resolved").length,
      urgent: cases.filter(item => item.priority === "urgent" && item.status !== "resolved").length,
      recentNegative: negative.slice(0, 12).map(item => ({
        id: item._id, category: item.category, message: item.message.slice(0, 220),
        status: item.status, priority: item.priority || "standard", createdAt: item.createdAt,
      })),
      daily: buckets, limited: visits.length > 5000 || recentUsers.length > 5000 || cases.length > 1000 || ctas.length > 5000 || eventRecords.length > 5000 || orders.length > 5000,
    };
  },
});
