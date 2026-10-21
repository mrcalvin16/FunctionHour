import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import EventsPageClient from "./EventsPageClient";

export const revalidate = 300;

export default async function EventsPage() {
  let initialEvents: Awaited<ReturnType<typeof getEvents>> = [];
  try {
    initialEvents = await getEvents();
  } catch (error) {
    console.error("Unable to preload public events:", error);
  }
  return <EventsPageClient initialEvents={initialEvents} />;
}

async function getEvents() {
  return getConvexClient().query(api.events.getAll, {});
}
