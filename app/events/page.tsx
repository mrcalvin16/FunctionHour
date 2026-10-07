"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePreferredCity } from "@/hooks/usePreferredCity";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";
import { matchesDiscoveryCity } from "@/lib/discoveryCities";
import DiscoveryEmptyState from "./components/DiscoveryEmptyState";
import ExperienceHero, { type QuickFilter } from "./components/ExperienceHero";
import DiscoveryCollections from "./components/DiscoveryCollections";
import LiveMapSection from "./components/LiveMapSection";
import FeaturedHosts from "./components/FeaturedHosts";
import EventList from "./components/EventList";
import {
  discoveryScore,
  getEventCategory,
  getEventTimestamp,
  isEventUpcoming,
  isThisWeekend,
  isTonight,
  matchesCollection,
  type DiscoveryEvent,
} from "./eventPresentation";

function eventMatchesCategory(event: DiscoveryEvent, category: string) {
  if (category === "All") return true;
  return getEventCategory(event).toLowerCase() === category.toLowerCase();
}

function eventMatchesSearch(event: DiscoveryEvent, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    event.name,
    event.description,
    event.category,
    event.location,
    event.venueName,
    event.venueAddress,
    event.city,
    event.state,
    event.dateString,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export default function EventsPage() {
  const [activeCollection, setActiveCollection] = useState("all");
  const [view, setView] = useState<"all" | "mine">("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [city, setCity] = usePreferredCity();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");

  const events = useQuery(api.events.getAll, {});
  const myEvents = useQuery(api.events.getMyEvents);
  const savedEventIds = useQuery(api.savedEvents.getSavedEventIds) || [];
  const toggleSaved = useMutation(api.savedEvents.toggleSavedEvent);

  useEffect(() => {
    const requestedCity = new URLSearchParams(window.location.search).get("city");
    if (requestedCity) setCity(requestedCity);
  }, [setCity]);

  const organizerStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events ?? []) {
      const organizerKey = event.organizerId || event.userId;
      if (!organizerKey) continue;
      counts.set(organizerKey, (counts.get(organizerKey) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 6);
  }, [events]);

  const upcomingEvents = useMemo(
    () => ((events ?? []) as DiscoveryEvent[]).filter((event) => isEventUpcoming(event)),
    [events],
  );

  const displayedEvents = useMemo(() => {
    const baseEvents = (view === "mine" ? myEvents ?? [] : events ?? []) as DiscoveryEvent[];

    return baseEvents
      .filter((event) => isEventUpcoming(event))
      .filter((event) => eventMatchesCategory(event, category))
      .filter((event) => matchesDiscoveryCity(event, city))
      .filter((event) => eventMatchesSearch(event, search))
      .filter((event) => quickFilter === "free" ? Number(event.startingPrice ?? event.price ?? 0) <= 0 : quickFilter === "tonight" ? isTonight(event) : quickFilter === "weekend" ? isThisWeekend(event) : true)
      .filter((event) => matchesCollection(event, activeCollection))
      .sort((a, b) => {
        const aDate = getEventTimestamp(a);
        const bDate = getEventTimestamp(b);
        if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) return aDate - bDate;
        if (Number.isFinite(aDate) !== Number.isFinite(bDate)) return Number.isFinite(aDate) ? -1 : 1;
        const scoreDifference = discoveryScore(b) - discoveryScore(a);
        if (scoreDifference !== 0) return scoreDifference;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  }, [activeCollection, category, city, events, myEvents, quickFilter, search, view]);

  async function toggleSavedEvent(eventId: Id<"events">) {
    try {
      await toggleSaved({ eventId });
    } catch (error) {
      console.error("Failed to toggle saved event:", error);
    }
  }

  if (events === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf7] text-zinc-900">
        <div className="text-lg">Loading events...</div>
      </main>
    );
  }

  return (
    <main className="safe-x min-h-screen overflow-x-hidden bg-[#fffaf7] text-zinc-950">
      <DiscoveryNav />

      <ExperienceHero
        presentation="directory"
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        city={city}
        setCity={setCity}
        view={view}
        setView={setView}
        events={upcomingEvents}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
      />

      {displayedEvents.length > 0 ? (
        <EventList
          events={displayedEvents}
          savedEventIds={savedEventIds}
          onToggleSave={toggleSavedEvent}
        />
      ) : (
        <DiscoveryEmptyState city={city} onReset={() => {
          setSearch(""); setCategory("All"); setCity("All Cities");
          setActiveCollection("all"); setView("all"); setQuickFilter("");
        }} />
      )}

      <DiscoveryCollections
        events={upcomingEvents}
        activeCollection={activeCollection}
        onSelect={(collection) => {
          setSearch("");
          setCategory("All");
          setCity("All Cities");
          setView("all");
          setQuickFilter("");
          setActiveCollection(collection);
          requestAnimationFrame(() => document.getElementById("event-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}
      />
      <LiveMapSection nearbyCount={displayedEvents.length} />
      <FeaturedHosts organizerStats={organizerStats} />

      <Footer />
    </main>
  );
}
