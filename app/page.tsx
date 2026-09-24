"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";
import ExperienceHero, { type QuickFilter } from "./events/components/ExperienceHero";
import EventGrid from "./events/components/EventGrid";
import TrendingCarousel from "./events/components/TrendingCarousel";
import { discoveryScore, isEventUpcoming, isThisWeekend, isTonight, type DiscoveryEvent } from "./events/eventPresentation";

function matches(event: DiscoveryEvent, search: string, category: string, city: string) {
  const searchable = [event.name, event.description, event.category, event.location, event.venueName, event.venueAddress, event.city, event.state, event.dateString]
    .filter(Boolean).join(" ").toLowerCase();
  return (!search.trim() || searchable.includes(search.trim().toLowerCase())) &&
    (category === "All" || searchable.includes(category.toLowerCase())) &&
    (city === "All Cities" || searchable.includes(city.toLowerCase()));
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [city, setCity] = useState("All Cities");
  const [view, setView] = useState<"all" | "mine">("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");
  const events = useQuery(api.events.getAll, {});
  const myEvents = useQuery(api.events.getMyEvents);
  const savedEventIds = useQuery(api.savedEvents.getSavedEventIds) || [];
  const toggleSaved = useMutation(api.savedEvents.toggleSavedEvent);

  const displayedEvents = useMemo(() => {
    const source = (view === "mine" ? myEvents ?? [] : events ?? []) as DiscoveryEvent[];
    return source.filter((event) => isEventUpcoming(event))
      .filter((event) => matches(event, search, category, city))
      .filter((event) => quickFilter === "free" ? Number(event.startingPrice ?? event.price ?? 0) <= 0 : quickFilter === "tonight" ? isTonight(event) : quickFilter === "weekend" ? isThisWeekend(event) : true)
      .sort((a, b) => discoveryScore(b) - discoveryScore(a));
  }, [category, city, events, myEvents, quickFilter, search, view]);

  async function toggleSavedEvent(eventId: Id<"events">) {
    try { await toggleSaved({ eventId }); }
    catch (error) { console.error("Failed to toggle saved event:", error); }
  }

  return (
    <main className="safe-x min-h-screen overflow-x-hidden bg-[#fffaf7] text-zinc-950">
      <DiscoveryNav />

      <ExperienceHero search={search} setSearch={setSearch} category={category} setCategory={setCategory} city={city} setCity={setCity} view={view} setView={setView} totalEvents={displayedEvents.length} events={((events ?? []) as DiscoveryEvent[]).filter((event) => isEventUpcoming(event))} quickFilter={quickFilter} setQuickFilter={setQuickFilter} />

      {events === undefined ? (
        <section className="mx-auto max-w-[1240px] px-5 py-20 text-center text-zinc-600">Loading events…</section>
      ) : displayedEvents.length > 0 ? (
        <>
          <TrendingCarousel city={city} events={displayedEvents.slice(0, 6)} savedEventIds={savedEventIds} onToggleSave={toggleSavedEvent} />
          <EventGrid events={displayedEvents} savedEventIds={savedEventIds} onToggleSave={toggleSavedEvent} />
        </>
      ) : (
        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-7 lg:px-8">
          <div className="rounded-3xl border border-zinc-200 bg-white/[0.035] p-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">No matches</p>
            <h2 className="mt-3 text-3xl font-black">Try another search, category, or city.</h2>
            <button type="button" onClick={() => { setSearch(""); setCategory("All"); setCity("All Cities"); setView("all"); setQuickFilter(""); }} className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-black text-black">Reset discovery</button>
          </div>
        </section>
      )}

      <section className="border-y border-zinc-200 bg-white px-5 py-12 text-center">
        <h2 className="text-3xl font-black">Want the full discovery experience?</h2>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600">Explore collections, hosts, the live map, and every Function Hour event.</p>
        <Link href="/events" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-gradient-to-r from-violet-500 to-orange-500 px-7 font-black">Open all events →</Link>
      </section>
      <Footer />
    </main>
  );
}
