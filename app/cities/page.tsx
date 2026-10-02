"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";

import { stateCities, featuredCities } from "@/lib/discoveryCities";

function cityHref(city: string, state: string) {
  return `/events?city=${encodeURIComponent(`${city}, ${state}`)}`;
}

export default function CitiesPage() {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const visibleStates = useMemo(
    () => stateCities.filter(([name, abbreviation, cities]) =>
      `${name} ${abbreviation} ${cities.join(" ")}`.toLowerCase().includes(normalizedSearch)
    ),
    [normalizedSearch],
  );

  return (
    <main className="min-h-screen bg-[#fffaf7] text-zinc-950">
      <DiscoveryNav />
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-700">Explore Function Hour</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Find your next night out.</h1>
          <p className="mt-4 text-base leading-7 text-zinc-600 sm:text-lg">Browse events by city across all 50 states. Pick a city to see what’s happening nearby.</p>
          <label className="mt-7 block">
            <span className="sr-only">Search states and cities</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a city or state"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </label>
        </div>

        {!normalizedSearch && <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Popular right now</p>
              <h2 className="mt-2 text-2xl font-black">Big cities. Great plans.</h2>
            </div>
            <Link href="/events" className="text-sm font-bold text-violet-700 hover:text-violet-900">All events →</Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {featuredCities.map(([city, state]) => (
              <Link key={`${city}-${state}`} href={cityHref(city, state)} className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-800">
                {city}, {state}
              </Link>
            ))}
          </div>
        </section>}

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">Browse all states</h2>
            <span className="text-sm text-zinc-500">{visibleStates.length} of 50 states</span>
          </div>
          {visibleStates.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-600">No matching city or state. Try another search.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleStates.map(([name, abbreviation, cities]) => (
                <details key={abbreviation} open={!!normalizedSearch} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black marker:hidden">
                    <span>{name}</span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-500">{abbreviation}</span>
                  </summary>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                    {cities.filter((city) => !normalizedSearch || `${name} ${abbreviation} ${city}`.toLowerCase().includes(normalizedSearch)).map((city) => (
                      <Link key={city} href={cityHref(city, abbreviation)} className="rounded-full bg-zinc-50 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-violet-50 hover:text-violet-800">{city}</Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </section>
      <Footer />
    </main>
  );
}
