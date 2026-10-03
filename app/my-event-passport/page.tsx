"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowUpRight, CalendarDays, MapPin, TicketCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
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
    return <main className="min-h-screen bg-[#080710] px-5 py-16 text-center text-white">Opening your passport…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#080710] px-5 py-16 text-white">
        <section className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-300">Function Hour</p>
          <h1 className="mt-3 text-3xl font-black">Your Event Passport</h1>
          <p className="mt-3 text-zinc-300">Sign in to see the past events in your ticket history.</p>
          <SignInButton mode="modal"><button className="mt-6 rounded-xl bg-white px-5 py-3 font-black text-black">Sign in</button></SignInButton>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080710] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="absolute -right-40 top-72 h-96 w-96 rounded-full bg-orange-500/10 blur-[140px]" />
      </div>

      <section className="relative mx-auto max-w-6xl">
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <Link href="/events" className="text-sm font-black tracking-tight text-white">FUNCTION<span className="text-violet-400">HOUR</span></Link>
          <div className="flex items-center gap-2">
            <Link href="/my-tickets" className="inline-flex min-h-10 items-center rounded-xl border border-white/10 px-4 text-sm font-bold text-zinc-200 hover:bg-white/10">My Tickets</Link>
            <Link href="/events" className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-black hover:bg-zinc-200">Explore events</Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>

        <header className="relative overflow-hidden rounded-[2rem] border border-violet-200/20 bg-gradient-to-br from-[#211543] via-[#15111f] to-[#29180f] p-6 shadow-2xl shadow-violet-950/20 sm:p-10">
          <div aria-hidden="true" className="absolute -right-8 -top-12 rotate-12 text-[150px] opacity-[0.07] sm:text-[220px]">✦</div>
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-violet-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-200"><TicketCheck className="h-3.5 w-3.5" /> Personal collection</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Your Event<br className="sm:hidden" /> Passport</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">A little time capsule of the nights, sounds, and people you found along the way. Built from past events in your ticket history.</p>
            </div>
            {years.length > 0 && (
              <label className="relative z-10 flex items-center gap-3 self-start rounded-2xl border border-white/15 bg-black/20 px-4 py-3 md:self-auto">
                <CalendarDays className="h-4 w-4 text-orange-300" />
                <span className="text-xs font-bold text-zinc-200">Your year</span>
                <select value={activeYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="bg-transparent text-sm font-black text-white outline-none">
                  {years.map((year) => <option key={year} value={year} className="bg-zinc-900">{year}</option>)}
                </select>
              </label>
            )}
          </div>
        </header>

        {tickets === undefined ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-zinc-300">Gathering your event stamps…</div>
        ) : yearEvents.length === 0 ? (
          <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#111019] p-8 text-center sm:p-14">
            <div aria-hidden="true" className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-dashed border-violet-300/40 bg-violet-300/10 text-4xl text-violet-200">✦</div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-violet-300">Passport awaiting its first stamp</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Your next favorite memory starts here.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">Past events from your ticket history will collect here, organized by year. Find something good and make a night of it.</p>
            <Link href="/events" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-black hover:bg-zinc-200">Find your next event <ArrowUpRight className="h-4 w-4" /></Link>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Events in {activeYear}</p><p className="mt-2 text-4xl font-black">{yearEvents.length}</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Most explored city</p><p className="mt-2 truncate text-2xl font-black">{highlights.city}</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Your scene</p><p className="mt-2 truncate text-2xl font-black">{highlights.category}</p></div>
            </section>

            <div className="mb-4 mt-10 flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Collected moments</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">{activeYear} passport stamps</h2></div>
              <p className="text-right text-xs text-zinc-400">{yearEvents.length} event{yearEvents.length === 1 ? "" : "s"}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {yearEvents.map(({ event, date, tickets: count, checkedIn }, index) => {
                const image = event.imageUrl || null;
                const place = event.city || event.location || "A night out";
                return (
                  <Link key={String(event._id)} href={`/events/${event._id}`} className="group relative isolate min-h-[270px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#17131f] shadow-lg transition hover:-translate-y-1 hover:border-violet-300/40">
                    {image ? <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/75 to-black/5" />
                    <div className="absolute right-4 top-4 rotate-6 rounded-full border-2 border-dashed border-orange-200/80 bg-orange-500/80 px-3 py-2 text-center text-[9px] font-black uppercase leading-tight tracking-wider text-white shadow-lg">
                      <span className="block">{checkedIn ? "Checked" : "Ticketed"}</span><span>{checkedIn ? "in" : "memory"}</span>
                    </div>
                    <div className="absolute left-4 top-4 rounded-lg bg-black/45 px-3 py-2 backdrop-blur-sm"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200">{formatMonth(date)}</p><p className="text-2xl font-black leading-none text-white">{new Date(date).getDate()}</p></div>
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-200"><MapPin className="h-3.5 w-3.5 text-orange-300" />{place}</p>
                      <h3 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-white">{event.name || "Untitled event"}</h3>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-300"><span className="truncate uppercase tracking-wider">{event.category || "Experience"}</span><span className="shrink-0">{formatLongDate(date)}</span></div>
                      {count > 1 && <p className="mt-2 text-[11px] text-zinc-300">{count} tickets for this event</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">Your passport reflects past tickets in your account. “Checked in” stamps indicate a ticket scan; other entries are based on ticket history.</p>
          </>
        )}
      </section>
    </main>
  );
}
