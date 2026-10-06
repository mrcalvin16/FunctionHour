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
