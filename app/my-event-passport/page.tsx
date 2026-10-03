"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowUpRight, CalendarDays, MapPin, TicketCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";
import type { Doc } from "@/convex/_generated/dataModel";

type PassportEvent = {
  event: Doc<"events">;
  date: number;
  tickets: number;
  checkedIn: boolean;
};

function getEventDate(event: { eventDate?: number; dateString?: string }) {
  if (typeof event.eventDate === "number" && Number.isFinite(event.eventDate)) return event.eventDate;
  return event.dateString ? Date.parse(event.dateString) : NaN;
}

function formatMonth(date: number) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatLongDate(date: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function MyEventPassportPage() {
  const { user, isLoaded } = useUser();
  const tickets = useQuery(api.tickets.getUserTickets, user ? {} : "skip");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const pastEvents = useMemo(() => {
    if (!tickets) return [];
    const byEvent = new Map<string, PassportEvent>();

    for (const ticket of tickets) {
      const event = ticket.event;
      if (!event || event.isDemo) continue;
      const date = getEventDate(event);
      if (!Number.isFinite(date) || date > Date.now()) continue;

      const key = String(event._id);
      const existing = byEvent.get(key);
      if (existing) {
        existing.tickets += 1;
        existing.checkedIn ||= ticket.checkedIn === true;
      } else {
        byEvent.set(key, { event, date, tickets: 1, checkedIn: ticket.checkedIn === true });
      }
    }

    return [...byEvent.values()].sort((a, b) => b.date - a.date);
  }, [tickets]);

  const years = useMemo(
    () => [...new Set(pastEvents.map(({ date }) => new Date(date).getFullYear()))].sort((a, b) => b - a),
    [pastEvents],
  );
  const activeYear = selectedYear && years.includes(selectedYear) ? selectedYear : years[0];
  const yearEvents = pastEvents.filter(({ date }) => new Date(date).getFullYear() === activeYear);

  const highlights = useMemo(() => {
    const mostFrequent = (values: string[]) => {
      const counts = new Map<string, number>();
      for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    };

    return {
      city: mostFrequent(yearEvents.map(({ event }) => event.city || event.location?.split(",")[0] || "")),
      category: mostFrequent(yearEvents.map(({ event }) => event.category || "")),
    };
  }, [yearEvents]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-zinc-950">
        <DiscoveryNav />
        <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-5 py-16 text-center">
          <p className="text-sm font-semibold text-zinc-600">Opening your passport…</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-zinc-950">
        <DiscoveryNav />
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-7 lg:px-8">
          <div className="mx-auto max-w-lg rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-[#fff4ed] to-[#fff0f5] p-8 text-center shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-700">Your collection</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950">Your Event Passport</h1>
          <p className="mt-3 leading-6 text-zinc-600">Sign in to see the past events in your ticket history.</p>
          <SignInButton mode="modal"><button className="mt-6 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-3 font-black text-white shadow-sm transition hover:brightness-95">Sign in</button></SignInButton>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="safe-x min-h-screen overflow-x-hidden bg-[#fffaf7] text-zinc-950">
      <DiscoveryNav />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 h-[520px] overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-orange-200/40 blur-[130px]" />
        <div className="absolute -right-40 top-24 h-96 w-96 rounded-full bg-pink-200/35 blur-[140px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-5 py-8 sm:px-7 lg:px-8 lg:py-10">
       <header className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white via-[#fff3eb] to-[#fff0f5] p-6 shadow-sm sm:p-10">
          <div aria-hidden="true" className="absolute -right-8 -top-12 rotate-12 text-[150px] opacity-[0.07] sm:text-[220px]">✦</div>
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-700"><TicketCheck className="h-3.5 w-3.5" /> Personal collection</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-zinc-950 sm:text-6xl">Your Event<br className="sm:hidden" /> Passport</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">A little time capsule of the nights, sounds, and people you found along the way. Built from past events in your ticket history.</p>
            </div>
            {years.length > 0 && (
              <label className="relative z-10 flex items-center gap-3 self-start rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 md:self-auto">
                <CalendarDays className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-bold text-zinc-600">Your year</span>
                <select value={activeYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="bg-transparent text-sm font-black text-zinc-900 outline-none">
                  {years.map((year) => <option key={year} value={year} className="bg-white text-zinc-900">{year}</option>)}
                </select>
              </label>
            )}
          </div>
        </header>

        {tickets === undefined ? (
          <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-10 text-center text-zinc-600 shadow-sm">Gathering your event stamps…</div>
        ) : yearEvents.length === 0 ? (
          <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-14">
            <div aria-hidden="true" className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-dashed border-orange-300 bg-gradient-to-br from-orange-100 to-pink-100 text-4xl text-orange-700">✦</div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-orange-700">Passport awaiting its first stamp</p>
            <h2 className="mt-2 text-2xl font-black text-zinc-950 sm:text-3xl">Your next favorite memory starts here.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-600">Past events from your ticket history will collect here, organized by year. Find something good and make a night of it.</p>
            <Link href="/events" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 text-sm font-black text-white shadow-sm hover:brightness-95">Find your next event <ArrowUpRight className="h-4 w-4" /></Link>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Events in {activeYear}</p><p className="mt-2 text-4xl font-black text-zinc-950">{yearEvents.length}</p></div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Most explored city</p><p className="mt-2 truncate text-2xl font-black text-zinc-950">{highlights.city}</p></div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Your scene</p><p className="mt-2 truncate text-2xl font-black">{highlights.category}</p></div>
            </section>

            <div className="mb-4 mt-10 flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-700">Collected moments</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">{activeYear} passport stamps</h2></div>
              <p className="text-right text-xs text-zinc-500">{yearEvents.length} event{yearEvents.length === 1 ? "" : "s"}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {yearEvents.map(({ event, date, tickets: count, checkedIn }) => {
                const image = event.imageUrl || null;
                const hasImage = Boolean(image);
                const place = event.city || event.location || "A night out";
                return (
                                    <Link
                    key={String(event._id)}
                    href={`/events/${event._id}`}
                    className={`group relative isolate min-h-[270px] overflow-hidden rounded-[1.6rem] border shadow-sm transition hover:-translate-y-1 hover:border-orange-300 ${hasImage ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-gradient-to-br from-white via-[#fff3eb] to-[#fff0f5]"}`}
                  >
                    {image ? (
                      <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
                        <div className="absolute -right-8 -top-10 rotate-12 text-[180px] font-black text-orange-500/[0.07]">✦</div>
                        <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-pink-200/50 blur-3xl" />
                      </div>
                    )}
                    <div className={`absolute inset-0 -z-10 ${hasImage ? "bg-gradient-to-t from-black via-black/75 to-black/5" : "bg-gradient-to-t from-white/95 via-white/30 to-transparent"}`} />
                    <div className={`absolute right-4 top-4 rotate-6 rounded-full border-2 border-dashed px-3 py-2 text-center text-[9px] font-black uppercase leading-tight tracking-wider shadow-lg ${hasImage ? "border-orange-100 bg-gradient-to-br from-orange-500 to-pink-500 text-white" : "border-orange-500/70 bg-white/80 text-orange-700"}`}>
                      <span className="block">{checkedIn ? "Checked" : "Ticketed"}</span><span>{checkedIn ? "in" : "memory"}</span>
                    </div>
                    <div className={`absolute left-4 top-4 rounded-lg px-3 py-2 backdrop-blur-sm ${hasImage ? "bg-black/45" : "bg-white/75 shadow-sm"}`}><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${hasImage ? "text-orange-200" : "text-orange-700"}`}>{formatMonth(date)}</p><p className={`text-2xl font-black leading-none ${hasImage ? "text-white" : "text-zinc-950"}`}>{new Date(date).getDate()}</p></div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className={`flex items-center gap-1.5 text-xs font-bold ${hasImage ? "text-zinc-200" : "text-zinc-600"}`}><MapPin className={`h-3.5 w-3.5 ${hasImage ? "text-orange-300" : "text-orange-600"}`} />{place}</p>
                      <h3 className={`mt-2 line-clamp-2 text-xl font-black leading-tight ${hasImage ? "text-white" : "text-zinc-950"}`}>{event.name || "Untitled event"}</h3>
                      <div className={`mt-3 flex items-center justify-between gap-3 text-xs ${hasImage ? "text-zinc-300" : "text-zinc-600"}`}><span className="truncate uppercase tracking-wider">{event.category || "Experience"}</span><span className="shrink-0">{formatLongDate(date)}</span></div>
                      {count > 1 && <p className={`mt-2 text-[11px] ${hasImage ? "text-zinc-300" : "text-zinc-600"}`}>{count} tickets for this event</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">Your passport reflects past tickets in your account. “Checked in” stamps indicate a ticket scan; other entries are based on ticket history.</p>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
