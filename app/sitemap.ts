import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { featuredCities, matchesDiscoveryCity } from "@/lib/discoveryCities";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://functionhour.com";
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/events`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/cities`, changeFrequency: "weekly", priority: 0.6 },
  ];

  try {
    const events = await getConvexClient().query(api.events.getAll, {});
    const eventPages: MetadataRoute.Sitemap = events
      .filter((event) => !event.isDemo && !event.demoHidden && event.eventStatus !== "cancelled" && event.eventStatus !== "postponed")
      .map((event) => ({
        url: `${base}/events/${event._id}`,
        lastModified: new Date(event.createdAt || Date.now()),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
    const liveEvents = events.filter((event) => !event.isDemo && !event.demoHidden && event.eventStatus !== "cancelled" && event.eventStatus !== "postponed");
    const cityPages: MetadataRoute.Sitemap = featuredCities
      .filter(([city, state]) => liveEvents.some((event) => matchesDiscoveryCity(event, `${city}, ${state}`)))
      .map(([city, state]) => ({
        url: `${base}/cities/${`${city}-${state}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    return [...staticPages, ...cityPages, ...eventPages];
  } catch (error) {
    console.error("Could not load event sitemap entries:", error);
    return staticPages;
  }
}
