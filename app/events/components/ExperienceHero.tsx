"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import ExperienceUniverse from "./ExperienceUniverse";
import { getEventCategory, type DiscoveryEvent } from "../eventPresentation";

type EventsView = "all" | "mine";
export type QuickFilter = "" | "tonight" | "weekend" | "free";

type ExperienceHeroProps = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  city: string;
  setCity: Dispatch<SetStateAction<string>>;
  view: EventsView;
  setView: Dispatch<SetStateAction<EventsView>>;
  events: DiscoveryEvent[];
  quickFilter: QuickFilter;
  setQuickFilter: Dispatch<SetStateAction<QuickFilter>>;
  presentation?: "universe" | "directory";
};

export default function ExperienceHero({
  search,
  setSearch,
  category,
  setCategory,
  city,
  setCity,
  view,
  setView,
  events,
  quickFilter,
  setQuickFilter,
  presentation = "universe",
}: ExperienceHeroProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cityOptions = useMemo(() => {
    const counts = new Map<string, { city: string; state: string; count: number }>();
    for (const event of events) {
      const eventCity = event.city?.trim() || event.location?.split(",")[0]?.trim() || "";
      const state = event.state?.trim() || event.location?.split(",")[1]?.trim().split(/\s+/)[0] || "";
      if (!eventCity) continue;
      const key = (eventCity + "|" + state).toLowerCase();
      const previous = counts.get(key);
      counts.set(key, { city: eventCity, state, count: (previous?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((a, b) => a.city.localeCompare(b.city));
  }, [events]);
  const liveCategoryNames = [...new Set(events.map(getEventCategory))];
  const availableCategories = ["All", ...liveCategoryNames];
  if (!availableCategories.includes(category)) availableCategories.push(category);
  const hasFilters = Boolean(search || category !== "All" || city !== "All Cities" || view !== "all" || quickFilter);
  const extraFilterCount = Number(Boolean(quickFilter)) + Number(view === "mine");
  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setCity("All Cities");
    setView("all");
    setQuickFilter("");
  };

  const controlClass = "h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

  return (
    <section className="border-b border-zinc-200 bg-[#fffaf7] text-zinc-950">
      <div className="mx-auto max-w-[1240px] px-5 py-5 sm:px-7 lg:px-8 lg:py-6">
        {presentation === "universe" ? (
          <div className="grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-800">
                ✦ Discover experiences
              </p>
              <h1 className="mt-3 text-[2.8rem] font-black leading-[0.95] tracking-[-0.055em] text-zinc-950 sm:text-[3.6rem] lg:text-[4.25rem]">
                Find your
                <span className="mt-1 block bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">next event.</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-700 sm:text-base">
                Concerts, festivals, nightlife, and local experiences. Find your next good time.
              </p>
            </div>
            <ExperienceUniverse />
          </div>
        ) : (
          <h1 className="sr-only">Browse upcoming events</h1>
        )}

        <div id="event-filters" className={presentation === "universe" ? "mt-4 scroll-mt-24" : "scroll-mt-24"}>
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:gap-3">
            <div className="col-span-3 flex h-12 min-w-0 items-center gap-3 rounded-xl border border-zinc-300 bg-white px-3 transition focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100 lg:col-span-1">
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-violet-700" />
              <input
                aria-label="Search events"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events, artists, or venues"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-600"
              />
              {search && (
                <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select aria-label="Filter by city" value={city} onChange={(event) => setCity(event.target.value)} className={controlClass}>
              <option value="All Cities">All cities</option>
              {cityOptions.map((item) => {
                const value = item.state ? `${item.city}, ${item.state}` : item.city;
                return <option key={value} value={value}>{value} ({item.count})</option>;
              })}
              {city !== "All Cities" && !cityOptions.some((item) => (item.state ? `${item.city}, ${item.state}` : item.city) === city) && <option value={city}>{city}</option>}
            </select>
            <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className={controlClass}>
              {availableCategories.map((label) => <option key={label} value={label}>{label === "All" ? "All categories" : label}</option>)}
            </select>
            <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="extra-event-filters" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-800 transition hover:bg-violet-100">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">More filters</span>
              <span className="sm:hidden">Filters</span>
              {extraFilterCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-700 text-[11px] text-white">{extraFilterCount}</span>}
            </button>
          </div>

          {filtersOpen && (
            <div id="extra-event-filters" className="mt-3 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <label className="space-y-1.5 text-xs font-bold text-zinc-700">
                <span>When / price</span>
                <select value={quickFilter} onChange={(event) => setQuickFilter(event.target.value as QuickFilter)} className={controlClass}>
                  <option value="">Any time, any price</option>
                  <option value="tonight">Tonight</option>
                  <option value="weekend">This weekend</option>
                  <option value="free">Free events</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-bold text-zinc-700">
                <span>Show</span>
                <select value={view} onChange={(event) => setView(event.target.value as EventsView)} className={controlClass}>
                  <option value="all">All events</option>
                  <option value="mine">My events</option>
                </select>
              </label>
              <a href="/map" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 text-sm font-bold text-zinc-800 hover:bg-zinc-50"><MapPin className="h-4 w-4" />Explore nearby</a>
            </div>
          )}

          {hasFilters && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-700" aria-live="polite">
              <span>{[category !== "All" && category, city !== "All Cities" && city, quickFilter === "tonight" ? "Tonight" : quickFilter === "weekend" ? "This weekend" : quickFilter === "free" ? "Free events" : "", view === "mine" && "My events"].filter(Boolean).join(" · ") || "Search active"}</span>
              <button type="button" onClick={resetFilters} className="min-h-9 font-bold text-violet-800 underline underline-offset-2">Reset filters</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
