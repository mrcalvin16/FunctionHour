"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import OrganizerPortalLink from "@/components/OrganizerPortalLink";
import Footer from "@/components/Footer";
import ExperienceHero, { type QuickFilter } from "./components/ExperienceHero";
import TrendingCarousel from "./components/TrendingCarousel";
import DiscoveryCollections from "./components/DiscoveryCollections";
import LiveMapSection from "./components/LiveMapSection";
import FeaturedHosts from "./components/FeaturedHosts";
import EventGrid from "./components/EventGrid";
import {
  discoveryScore,
  isEventUpcoming,
  isThisWeekend,
  isTonight,
  matchesCollection,
  type DiscoveryEvent,
} from "./eventPresentation";

function eventMatchesCategory(event: DiscoveryEvent, category: string) {
  if (category === "All") return true;
  const text = [event.category, event.name, event.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return text.includes(category.toLowerCase());
}

function eventMatchesCity(event: DiscoveryEvent, city: string) {
  if (city === "All Cities") return true;
  const normalize = (value: string) => value.toLowerCase().replace(/[,.]/g, " ").replace(/\s+/g, " ").trim();
  const text = [event.city, event.state, event.location, event.venueName, event.venueAddress]
    .filter(Boolean)
    .join(" ");
  return normalize(text).includes(normalize(city));
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
  const [city, setCity] = useState("All Cities");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");

  const events = useQuery(api.events.getAll, {});
  const myEvents = useQuery(api.events.getMyEvents);
  const savedEventIds = useQuery(api.savedEvents.getSavedEventIds) || [];
  const toggleSaved = useMutation(api.savedEvents.toggleSavedEvent);

  useEffect(() => {
    const requestedCity = new URLSearchParams(window.location.search).get("city");
    if (requestedCity) setCity(requestedCity);
  }, []);

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

  const displayedEvents = useMemo(() => {
    const baseEvents = (view === "mine" ? myEvents ?? [] : events ?? []) as DiscoveryEvent[];

    return baseEvents
      .filter((event) => isEventUpcoming(event))
      .filter((event) => eventMatchesCategory(event, category))
      .filter((event) => eventMatchesCity(event, city))
      .filter((event) => eventMatchesSearch(event, search))
      .filter((event) => quickFilter === "free" ? Number(event.startingPrice ?? event.price ?? 0) <= 0 : quickFilter === "tonight" ? isTonight(event) : quickFilter === "weekend" ? isThisWeekend(event) : true)
      .filter((event) => matchesCollection(event, activeCollection))
      .sort((a, b) => {
        const scoreDifference = discoveryScore(b) - discoveryScore(a);
        if (scoreDifference !== 0) return scoreDifference;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  }, [activeCollection, category, city, events, myEvents, quickFilter, search, view]);

  const trendingEvents = useMemo(
    () => displayedEvents.slice(0, Math.min(6, displayedEvents.length)),
    [displayedEvents],
  );

  const trendingIds = useMemo(
    () => new Set(trendingEvents.map((event) => event._id)),
    [trendingEvents],
  );

  const gridEvents = useMemo(() => {
    const withoutTrending = displayedEvents.filter((event) => !trendingIds.has(event._id));
    return withoutTrending.length > 0 ? withoutTrending : displayedEvents;
  }, [displayedEvents, trendingIds]);

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
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="shrink-0 text-2xl font-extrabold tracking-[0.02em]" aria-label="Function Hour home">
            <span className="text-zinc-950">FUNCTION</span>
            <span className="text-violet-500">HOUR</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <div className="hidden items-center gap-3 md:flex">
              <Link href="/events" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950">Events</Link>
              <Link href="/map" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950">Map</Link>

              <SignedOut>
                <Link href="/explore" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950">Explore</Link>
                <Link href="/cities" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950">Cities</Link>
                <SignInButton mode="modal">
                  <button className="rounded-full border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">Create Event</button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Link href="/saved-events" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950">Saved</Link>
                <Link prefetch={false} href="/my-tickets" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950">My Tickets</Link>
                <Link href="/my-merch-orders" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-violet-500 hover:text-zinc-950">Merch orders</Link>
                <OrganizerPortalLink organizerLabel="Create Event" attendeeLabel="Create Event" organizerHref="/host/create" className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-800 hover:text-zinc-950" />
              </SignedIn>
            </div>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black sm:px-5">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/events" />
            </SignedIn>
          </div>
        </div>

        <div className="border-t border-zinc-200 px-4 py-3 md:hidden">
          <div className="flex gap-3 overflow-x-auto pb-1">
            <Link href="/events" className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Events</Link>
            <Link href="/map" className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700">Map</Link>
            <SignedIn>
              <Link href="/saved-events" className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700">Saved</Link>
              <Link prefetch={false} href="/my-tickets" className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700">My Tickets</Link>
              <Link href="/my-merch-orders" className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700">Merch orders</Link>
              <OrganizerPortalLink organizerLabel="Create Event" attendeeLabel="Create Event" organizerHref="/host/create" className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700" />
            </SignedIn>
          </div>
        </div>
      </nav>

      <ExperienceHero
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        city={city}
        setCity={setCity}
        view={view}
        setView={setView}
        totalEvents={displayedEvents.length}
        events={((events ?? []) as DiscoveryEvent[]).filter((event) => isEventUpcoming(event))}
        quickFilter={quickFilter}
        setQuickFilter={setQuickFilter}
      />

      {trendingEvents.length > 0 && (
        <TrendingCarousel
          city={city}
          events={trendingEvents}
          savedEventIds={savedEventIds}
          onToggleSave={toggleSavedEvent}
        />
      )}

      {displayedEvents.length > 0 ? (
        <EventGrid
          events={gridEvents}
          savedEventIds={savedEventIds}
          onToggleSave={toggleSavedEvent}
        />
      ) : (
        <section className="mx-auto max-w-[1240px] px-5 pb-20 sm:px-7 lg:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-700">No matches</p>
            <h2 className="mt-3 text-3xl font-black text-zinc-950">Try a broader search or another collection.</h2>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
                setCity("All Cities");
                setActiveCollection("all");
                setView("all");
                setQuickFilter("");
              }}
              className="mt-6 rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              Reset discovery
            </button>
          </div>
        </section>
      )}

      <DiscoveryCollections activeCollection={activeCollection} onSelect={setActiveCollection} />
      <LiveMapSection nearbyCount={displayedEvents.length} />
      <FeaturedHosts organizerStats={organizerStats} />

      <Footer />
    </main>
  );
}
