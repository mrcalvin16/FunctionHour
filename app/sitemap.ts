import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

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
    return [...staticPages, ...eventPages];
  } catch (error) {
    console.error("Could not load event sitemap entries:", error);
    return staticPages;
  }
}
