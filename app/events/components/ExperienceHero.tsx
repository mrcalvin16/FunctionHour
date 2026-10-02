"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Church,
  Compass,
  Handshake,
  LayoutGrid,
  Music2,
  PartyPopper,
  Presentation,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  MapPin,
  Search,
} from "lucide-react";
import ExperienceUniverse from "./ExperienceUniverse";
import { getEventCategory, isThisWeekend, isTonight, type DiscoveryEvent } from "../eventPresentation";

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

const categories = [
  { label: "All", icon: LayoutGrid },
  { label: "Experience", icon: Compass },
  { label: "Concert", icon: Music2 },
  { label: "Reunion", icon: Users },
  { label: "Conference", icon: Presentation },
  { label: "Party", icon: PartyPopper },
  { label: "Religious", icon: Church },
  { label: "Festival", icon: Sparkles },
  { label: "Food", icon: Utensils },
  { label: "Networking", icon: Handshake },
  { label: "Sports", icon: Trophy },
];

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
  const [citySearch, setCitySearch] = useState("");
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const cityOptions = useMemo(() => {
    const counts = new Map();
    for (const event of events) {
      const eventCity = event.city?.trim() || event.location?.split(",")[0]?.trim() || "";
      const state = event.state?.trim() || event.location?.split(",")[1]?.trim().split(/\s+/)[0] || "";
      if (!eventCity) continue;
      const key = (eventCity + "|" + state).toLowerCase();
      const previous = counts.get(key);
      counts.set(key, { city: eventCity, state, count: (previous?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((a, b) => a.state.localeCompare(b.state) || a.city.localeCompare(b.city));
  }, [events]);
  const popularCities = [...cityOptions].sort((a, b) => b.count - a.count).slice(0, 4);
  const liveCategoryNames = [...new Set(events.map(getEventCategory))];
  const availableCategories = [categories[0], ...liveCategoryNames.map((label) => ({
    label,
    icon: categories.find((item) => item.label.toLowerCase() === label.toLowerCase())?.icon ?? Compass,
  }))];
  const quickChips = (presentation === "directory" ? ["Near Me", "Tonight", "This Weekend", "Free"] : ["Near Me", "Tonight", "This Weekend", "Free", "Music", "Comedy", "Food", "Sports", "Networking"])
    .filter((chip) => chip === "Near Me" || events.some((event) => {
      if (chip === "Tonight") return isTonight(event);
      if (chip === "This Weekend") return isThisWeekend(event);
      if (chip === "Free") return Number(event.startingPrice ?? event.price ?? 0) <= 0;
      const text = [event.name, event.description, getEventCategory(event)].join(" ").toLowerCase();
      return text.includes(chip.toLowerCase());
    }));
  const trendingTerms = ["Essence", "Jazz Fest", "Brunch", "Live Music", "Happy Hour"].filter((term) =>
    events.some((event) => [event.name, event.description, getEventCategory(event)].join(" ").toLowerCase().includes(term.toLowerCase())),
  );
  const visibleCities = cityOptions.filter((item) => (item.city + " " + item.state).toLowerCase().includes(citySearch.toLowerCase()));
  const states = [...new Set(visibleCities.map((item) => item.state || "Other locations"))];
  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setCity("All Cities");
    setView("all");
    setQuickFilter("");
  };

  const activateQuickFilter = (chip: string) => {
    if (chip === "Near Me") {
      window.location.assign("/map");
      return;
    }
    setView("all");
    if (chip === "Tonight") {
      setSearch("");
      setCategory("All");
      setQuickFilter(quickFilter === "tonight" ? "" : "tonight");
      return;
    }
    if (chip === "This Weekend") {
      setSearch("");
      setCategory("All");
      setQuickFilter(quickFilter === "weekend" ? "" : "weekend");
      return;
    }
    if (chip === "Free") {
      setSearch("");
      setCategory("All");
      setQuickFilter(quickFilter === "free" ? "" : "free");
      return;
    }
    setQuickFilter("");
    if (chip === "Food" || chip === "Sports" || chip === "Networking") {
      setCategory(chip);
      setSearch("");
    } else {
      setCategory("All");
      setSearch(chip);
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-[#fffaf7] text-zinc-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[9%] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/35 blur-[140px]" />
        <div className="absolute right-[9%] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-orange-200/35 blur-[145px]" />
        <div className="absolute bottom-[-15rem] left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-pink-100/45 blur-[150px]" />
      </div>

      <div className={`relative mx-auto max-w-[1240px] px-5 sm:px-7 lg:px-8 ${presentation === "universe" ? "pb-7 pt-8 lg:pb-9 lg:pt-10" : "pb-5 pt-5"}`}>
        <div className={presentation === "universe" ? "grid gap-9 lg:grid-cols-[0.88fr_1.12fr] lg:items-center" : "max-w-4xl"}>
          <div className="relative z-10">
            {presentation === "directory" && <h1 className="sr-only">Browse upcoming events</h1>}
            {presentation === "universe" && <>
              <div className="inline-flex items-center gap-3 rounded-full border border-violet-200 bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.26em] text-violet-800 shadow-sm">
                <span className="text-violet-700">✦</span>
                Discover experiences
              </div>
              <h1 className="mt-5 text-[3.7rem] font-black leading-[0.9] tracking-[-0.065em] text-zinc-950 sm:text-[4.7rem] lg:text-[5.25rem]">
                Find your
                <span className="mt-1 block bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400 bg-clip-text text-transparent">next event.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-zinc-600 sm:text-base">
                Search concerts, festivals, nightlife, pop-ups, networking events, and local experiences.
              </p>
            </>}

            {presentation === "universe" && <div className="mt-5 lg:hidden"><ExperienceUniverse /></div>}

            <div className={`max-w-[620px] ${presentation === "universe" ? "mt-7" : "mt-0"}`}>
  <div className="flex h-[68px] items-center rounded-[1.5rem] border border-zinc-200 bg-white p-2 shadow-sm transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-lg text-orange-700">
      🔍
    </div>

    <input
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      placeholder="Search events, artists, venues, neighborhoods..."
      className="flex-1 bg-transparent px-4 text-zinc-900 outline-none placeholder:text-zinc-400"
    />

    {search ? (
      <button
        type="button"
        onClick={() => setSearch("")}
        className="rounded-xl px-4 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
      >
        Clear
      </button>
    ) : (
      <button
        type="button"
        onClick={() => document.getElementById("event-filters")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
      >
        Filters
      </button>
    )}
  </div>

  <div className="mt-5 flex flex-wrap gap-3">
    {quickChips.map((chip) => (
      <button
        key={chip}
        type="button"
        onClick={() => activateQuickFilter(chip)}
        aria-pressed={(chip === "Tonight" && quickFilter === "tonight") || (chip === "This Weekend" && quickFilter === "weekend") || (chip === "Free" && quickFilter === "free")}
        className={`rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 ${
          (chip === "Tonight" && quickFilter === "tonight") || (chip === "This Weekend" && quickFilter === "weekend") || (chip === "Free" && quickFilter === "free")
            ? "border-orange-300 bg-orange-50 text-orange-800"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-orange-200 hover:bg-orange-50"
        }`}
      >
        {chip}
      </button>
    ))}
  </div>

  {presentation === "universe" && trendingTerms.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
    <span className="font-bold text-zinc-500">
      Trending
    </span>

    {trendingTerms.map((term) => (
      <button
        key={term}
        type="button"
        onClick={() => {
          setSearch(term);
          setCategory("All");
          setQuickFilter("");
          document.getElementById("event-results")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
      >
        {term}
      </button>
    ))}
  </div>}
</div>
          </div>

          {presentation === "universe" && <div className="hidden lg:block"><ExperienceUniverse /></div>}
        </div>

        <div id="event-filters" className={`scroll-mt-28 overflow-hidden rounded-[1.65rem] border border-zinc-200 bg-white shadow-sm ${presentation === "universe" ? "mt-8" : "mt-4"}`}>
          <div className="grid grid-cols-4 gap-1 p-2 sm:grid-cols-6 lg:grid-cols-11">
            {availableCategories.map((item) => {
              const isActive = category === item.label;
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setCategory(item.label)}
                  className={`group flex min-h-[76px] flex-col items-center justify-center rounded-[1.15rem] px-2 py-3 text-center transition ${
                    isActive
                      ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                  <span className="mt-2 text-[11px] font-black">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-3 py-3">
            <button type="button" onClick={() => setCity("All Cities")} aria-pressed={city === "All Cities"} className={"rounded-full border px-4 py-2.5 text-xs font-black " + (city === "All Cities" ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50")}>All cities</button>
            {popularCities.map((item) => {
              const value = item.state ? item.city + ", " + item.state : item.city;
              return <button key={value} type="button" onClick={() => setCity(value)} aria-pressed={city === value} className={"rounded-full border px-4 py-2.5 text-xs font-black " + (city === value ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50")}>{item.city}{item.state ? ", " + item.state : ""}<span className="ml-2 text-violet-700">{item.count}</span></button>;
            })}
            <button type="button" onClick={() => setCityPickerOpen(!cityPickerOpen)} aria-expanded={cityPickerOpen} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-800"><MapPin className="h-3.5 w-3.5" />Browse {cityOptions.length} cities</button>

            <button
              type="button"
              onClick={() => setView(view === "mine" ? "all" : "mine")}
              className={`rounded-full border px-5 py-2.5 text-xs font-black transition ${
                view === "mine"
                  ? "border-orange-500 bg-orange-500/20 text-orange-200"
                  : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
              }`}
            >
              My Events
            </button>

            {(search ||
              category !== "All" ||
              city !== "All Cities" ||
              view !== "all" ||
              quickFilter) && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto rounded-full px-4 py-2.5 text-xs font-bold text-zinc-600 transition hover:text-zinc-950"
              >
                Reset
              </button>
            )}
          </div>
          {cityPickerOpen && <div className="border-t border-zinc-200 p-4">
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3"><Search className="h-4 w-4 text-zinc-500" /><input value={citySearch} onChange={(event) => setCitySearch(event.target.value)} placeholder="Search city or state..." className="h-11 flex-1 bg-transparent text-sm text-zinc-900 outline-none" /></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{states.map((state) => <div key={state}><p className="mb-2 text-xs font-black uppercase tracking-widest text-violet-700">{state}</p><div className="flex flex-wrap gap-2">{visibleCities.filter((item) => (item.state || "Other locations") === state).map((item) => { const value = item.state ? item.city + ", " + item.state : item.city; return <button key={value} type="button" onClick={() => { setCity(value); setCityPickerOpen(false); setCitySearch(""); }} className={"rounded-full border px-3 py-2 text-xs " + (city === value ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-50")}>{value} · {item.count}</button>; })}</div></div>)}</div>
          </div>}
        </div>
      </div>
    </section>
  );
}
