import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isEventUpcoming } from "./eventDates";

function normalizeCity(city: string, state: string) {
  const cleanCity = city.trim().replace(/\s+/g, " ");
  const cleanState = state.trim().replace(/\s+/g, " ");
  if (!cleanCity || cleanCity.length > 100 || cleanState.length > 40 || !/^[\p{L} .'-]+$/u.test(cleanCity) || (cleanState && !/^[\p{L} .'-]+$/u.test(cleanState))) {
    throw new Error("Choose a valid city.");
  }
  return { city: cleanCity, state: cleanState, cityKey: `${cleanCity}|${cleanState}`.toLowerCase() };
}

export const getMyFollows = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const [cities, organizers, settings] = await Promise.all([
      ctx.db.query("followedCities").withIndex("by_user", (q) => q.eq("userId", identity.subject)).take(100),
      ctx.db.query("followedOrganizers").withIndex("by_user", (q) => q.eq("userId", identity.subject)).take(100),
      ctx.db.query("discoveryAlertSettings").withIndex("by_user", (q) => q.eq("userId", identity.subject)).first(),
    ]);
    const organizerProfiles = await Promise.all(organizers.map(async (follow) => {
      const profile = await ctx.db.query("users")
        .withIndex("by_userId", (q) => q.eq("userId", follow.organizerUserId)).first();
      return { organizerUserId: follow.organizerUserId, createdAt: follow.createdAt, name: profile?.organizerName || profile?.name || "Organizer" };
    }));
    return {
      cities: cities.map(({ city, state, cityKey, createdAt }) => ({ city, state, cityKey, createdAt })),
      organizers: organizerProfiles,
      alertsEnabled: settings?.enabled ?? false,
      lastSeenAt: settings?.lastSeenAt ?? Date.now(),
    };
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const settings = await ctx.db.query("discoveryAlertSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject)).first();
    if (!settings?.enabled) return 0;
    const [cities, organizers, recentEvents] = await Promise.all([
      ctx.db.query("followedCities").withIndex("by_user", (q) => q.eq("userId", identity.subject)).take(100),
      ctx.db.query("followedOrganizers").withIndex("by_user", (q) => q.eq("userId", identity.subject)).take(100),
      ctx.db.query("events").order("desc").take(100),
    ]);
    return recentEvents.filter((event) => {
      const createdAt = event.createdAt ?? event._creationTime;
      if (!isEventUpcoming(event) || createdAt <= settings.lastSeenAt) return false;
      const eventCityKey = `${event.city?.trim() || ""}|${event.state?.trim() || ""}`.toLowerCase();
      return cities.some((follow) => follow.cityKey === eventCityKey && createdAt > follow.createdAt) ||
        organizers.some((follow) => follow.organizerUserId === (event.organizerId || event.userId) && createdAt > follow.createdAt);
    }).length;
  },
});

export const toggleCity = mutation({
  args: { city: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to follow a city.");
    const { city, state, cityKey } = normalizeCity(args.city, args.state);
    const existing = await ctx.db.query("followedCities")
      .withIndex("by_user_cityKey", (q) => q.eq("userId", identity.subject).eq("cityKey", cityKey)).first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    const followed = await ctx.db.query("followedCities")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject)).take(100);
    if (followed.length >= 100) throw new Error("You can follow up to 100 cities.");
    await ctx.db.insert("followedCities", { userId: identity.subject, city, state, cityKey, createdAt: Date.now() });
    return true;
  },
});

export const setAlertsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to manage alerts.");
    const current = await ctx.db.query("discoveryAlertSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject)).first();
    if (current) await ctx.db.patch(current._id, { enabled: args.enabled, ...(args.enabled && !current.enabled ? { lastSeenAt: Date.now() } : {}) });
    else await ctx.db.insert("discoveryAlertSettings", { userId: identity.subject, enabled: args.enabled, lastSeenAt: Date.now() });
  },
});

export const markAlertsSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to manage alerts.");
    const current = await ctx.db.query("discoveryAlertSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject)).first();
    if (current) await ctx.db.patch(current._id, { lastSeenAt: Date.now() });
  },
});
