import { internalMutation } from "./_generated/server";
import { SEASONAL_DEMOS } from "./seasonalDemoData";
import type { Id } from "./_generated/dataModel";

const HOSTS = {
  outreach: "FunctionHour Demo Outreach",
  celebrations: "FunctionHour Demo Celebrations",
  music: "FunctionHour Demo Live",
} as const;
const DISCLAIMER = "Demo listing only. This is a fictional event with an illustrative photo and venue. No real event, donation collection, or ticket purchase is associated with this listing.";

/** Deployment-only, additive import. Re-running never resets existing records. */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = new Map<string, Id<"events">>();
    for (const [host, name] of Object.entries(HOSTS)) {
      const userId = `demo-seasonal-${host}`;
      const profile = await ctx.db.query("users")
        .withIndex("by_userId", (q) => q.eq("userId", userId)).first();
      if (!profile) {
        await ctx.db.insert("users", {
          userId, clerkId: userId, tokenIdentifier: `demo:${userId}`,
          email: `${userId}@functionhour.example`, name, organizerName: name,
          bio: "Fictional FunctionHour host for sample event pages. No real events or bookings.",
          role: "organizer", isOrganizer: true, onboardingComplete: true,
          createdAt: now, updatedAt: now,
        });
      }
      const events = await ctx.db.query("events")
        .withIndex("by_userId", (q) => q.eq("userId", userId)).take(100);
      for (const event of events) {
        if (event.isDemo && event.demoKey) existing.set(event.demoKey, event._id);
      }
    }
    const eventIds: Id<"events">[] = [];
    let created = 0;
    for (const item of SEASONAL_DEMOS) {
      const found = existing.get(item.key);
      if (found) { eventIds.push(found); continue; }
      const userId = `demo-seasonal-${item.host}`;
      const eventId = await ctx.db.insert("events", {
        name: item.name, description: `${item.description}\n\n${DISCLAIMER}`,
        shortDescription: item.description, category: item.category,
        tags: [...item.tags], city: item.city, state: item.state,
        location: `${item.city}, ${item.state}`,
        venueName: "Illustrative Event Venue (Demo)",
        venueAddress: `Demo venue only — ${item.city}, ${item.state}`,
        longitude: item.longitude, latitude: item.latitude,
        dateString: item.start, eventDate: Date.parse(item.start),
        endDateString: item.end, endDate: Date.parse(item.end),
        price: item.price, totalTickets: item.capacity, ticketsSold: 0,
        maxTicketsPerOrder: 10, imageUrl: item.imageUrl,
        userId, organizerId: userId, createdAt: now,
        isDemo: true, demoKey: item.key, demoHidden: false,
        refundPolicy: DISCLAIMER, entryNotes: "Sample event. Reservations and purchases are disabled.",
        ageRequirement: item.tags.some((tag) => tag === "family-friendly") ? "All ages with adult supervision" : item.tags.some((tag) => tag === "21+") ? "21+" : "See organizer details (demo)",
      });
      await ctx.db.insert("ticketTypes", {
        eventId, name: item.price === 0 ? "Community Admission (Demo)" : "General Admission (Demo)",
        description: "Illustrative admission only. Not available for reservation or purchase.",
        price: item.price, quantity: item.capacity, sold: 0, isActive: true, createdAt: now,
      });
      eventIds.push(eventId);
      created++;
    }
    return { created, skipped: SEASONAL_DEMOS.length - created, total: eventIds.length, eventIds };
  },
});
