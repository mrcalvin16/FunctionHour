"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { ArrowLeft, List, RotateCcw, Search, Route } from "lucide-react";
import { api } from "@/convex/_generated/api";
import MapCanvas, {
  type MapEvent,
  type TimeMode,
} from "./components/MapCanvas";

const categories = [
  "All",
  "Experience",
  "Music",
  "Nightlife",
  "Festival",
  "Food",
  "Networking",
  "Free",
];

export default function MapPage() {
  const events = useQuery(api.events.getMapEvents);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [timeMode, setTimeMode] = useState<TimeMode>("all");
  const [mapAvailable, setMapAvailable] = useState<boolean | null>(null);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const term = search.trim().toLowerCase();
    return events.filter((event: MapEvent) => {
      const searchable = [
        event.name,
        event.description,
        event.location,
        event.venueName,
        event.venueAddress,
        event.city,
        event.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (term && !searchable.includes(term)) return false;
      if (activeCategory === "Free") return Number(event.startingPrice ?? event.price ?? 0) <= 0;
      if (activeCategory === "Experience") {
        return (event.category?.trim() || "Experience").toLowerCase() === "experience";
      }
      return (
        activeCategory === "All" ||
        event.category?.toLowerCase().includes(activeCategory.toLowerCase()) ||
        searchable.includes(activeCategory.toLowerCase())
      );
    });
  }, [activeCategory, events, search]);

  const resetFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setTimeMode("all");
  };

  return (
    <main className="functionhour-map-root relative h-[100dvh] overflow-hidden bg-[#f8fafc] text-zinc-950">
      <MapCanvas loading={events === undefined} events={filteredEvents} timeMode={timeMode} onAvailabilityChange={setMapAvailable} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-3 sm:p-5">
        <Link
          href="/"
          aria-label="Back to Function Hour home"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm font-black shadow-lg shadow-zinc-900/10 backdrop-blur-xl transition hover:bg-orange-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Function Hour</span>
          <span className="sm:hidden">Home</span>
        </Link>
        {/* Full reload releases Mapbox's WebGL context before list rendering. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/events"
          className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm font-black shadow-lg shadow-zinc-900/10 backdrop-blur-xl transition hover:bg-orange-50"
        >
          <List className="h-4 w-4" aria-hidden="true" />
          List view
        </a>
      </header>

      {mapAvailable !== false && <section className="absolute left-3 right-3 top-16 z-20 rounded-[1.75rem] border border-zinc-200 bg-white/95 p-3 shadow-[0_18px_60px_rgba(38,30,55,.14)] backdrop-blur-xl sm:left-5 sm:right-auto sm:top-20 sm:w-[390px] sm:p-5">
        <div className="hidden sm:block">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
            <Route className="h-4 w-4" aria-hidden="true" /> Function Hour event lines
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Pick your next stop.
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Explore event stops by name, venue, or city.
          </p>
        </div>

        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 sm:mt-4">
          <Search
            className="h-4 w-4 shrink-0 text-zinc-600"
            aria-hidden="true"
          />
          <span className="sr-only">Search events</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events or places"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-500"
          />
          {(search || activeCategory !== "All" || timeMode !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              aria-label="Reset map filters"
              className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${activeCategory === category ? "fh-map-inverse bg-violet-700 text-white shadow-md shadow-violet-500/20" : "border border-zinc-200 bg-white text-zinc-700 hover:border-violet-300 hover:bg-violet-50"}`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
          {(
            [
              ["all", "Any date"],
              ["tonight", "Tonight"],
              ["weekend", "Weekend"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeMode(value)}
              className={`min-h-10 rounded-xl px-2 text-[11px] font-black transition sm:text-xs ${timeMode === value ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3 hidden text-xs font-bold text-zinc-600 sm:block">
          {events === undefined
            ? "Loading events…"
            : `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"} match your search`}
        </p>
      </section>}
    </main>
  );
}
