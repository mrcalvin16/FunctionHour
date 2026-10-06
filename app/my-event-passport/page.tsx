"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  MapPinned,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";
import type { Doc } from "@/convex/_generated/dataModel";

type PassportEvent = {
  event: Doc<"events">;
  imageUrl: string | null;
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

function getCity(event: Doc<"events">) {
  return event.city || event.location?.split(",")[0] || "";
}

function PassportArtwork({
  year,
  eventCount,
  cityCount,
  categoryCount,
}: {
  year: number | undefined;
  eventCount: number;
  cityCount: number;
  categoryCount: number;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[390px] px-3 py-4 sm:px-6 lg:ml-auto">
      <div aria-hidden="true" className="absolute inset-4 rotate-[-7deg] rounded-[2rem] border border-orange-200/70 bg-white/70 shadow-sm" />
      <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 p-6 text-white shadow-[0_24px_60px_-28px_rgba(194,65,12,0.7)] sm:p-7">
        <div aria-hidden="true" className="absolute -right-12 -top-12 h-52 w-52 rounded-full border border-white/15" />
        <div aria-hidden="true" className="absolute -right-4 -top-4 h-36 w-36 rounded-full border border-white/15" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-pink-300/20 blur-2xl" />
        <div className="relative flex min-h-[245px] flex-col justify-between sm:min-h-[270px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/90">FunctionHour</span>
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/95">Personal edition</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-50/90">A life well spent</p>
              <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-5xl">Event<br />Passport</h2>
              <p className="mt-4 text-sm font-semibold text-orange-50/90">{year ? year + " collection" : "Your next story starts here"}</p>
            </div>
            <div className="grid h-[92px] w-[92px] shrink-0 rotate-6 place-items-center rounded-full border-2 border-dashed border-white/75 bg-white/10 text-center shadow-inner">
              <div>
                <TicketCheck className="mx-auto h-6 w-6 text-white" strokeWidth={2.5} />
                <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.15em]">{eventCount ? eventCount + " stamps" : "Ready"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-white/25 pt-4 text-[10px] font-bold text-white/90">
            <span>{eventCount} {eventCount === 1 ? "moment" : "moments"}</span>
            <span aria-hidden="true">·</span>
            <span>{cityCount} {cityCount === 1 ? "city" : "cities"}</span>
            <span aria-hidden="true">·</span>
            <span>{categoryCount} {categoryCount === 1 ? "scene" : "scenes"}</span>
          </div>
        </div>
      </div>
    </div>
  );
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
        existing.imageUrl ||= ticket.imageUrl || event.imageUrl || null;
        existing.tickets += 1;
        existing.checkedIn ||= ticket.checkedIn === true;
      } else {
        byEvent.set(key, { event, imageUrl: ticket.imageUrl || event.imageUrl || null, date, tickets: 1, checkedIn: ticket.checkedIn === true });
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
      city: mostFrequent(yearEvents.map(({ event }) => getCity(event))),
      category: mostFrequent(yearEvents.map(({ event }) => event.category || "")),
    };
  }, [yearEvents]);

  const cityCount = new Set(yearEvents.map(({ event }) => getCity(event)).filter(Boolean)).size;
  const categoryCount = new Set(yearEvents.map(({ event }) => event.category).filter(Boolean)).size;

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-zinc-950">
        <DiscoveryNav />
        <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center px-5 py-16 text-center">
          <p className="text-sm font-semibold text-zinc-600">Gathering your event memories…</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#fffaf7] text-zinc-950">
        <DiscoveryNav />
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-7 md:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:px-8">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-800"><TicketCheck className="h-3.5 w-3.5" /> Your personal collection</p>
            <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.06em] text-zinc-950 sm:text-6xl">The best nights<br className="hidden sm:block" /> stay with you.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">Your Event Passport brings your past FunctionHour events together in one place: the music, the people, the places, and the little moments worth keeping.</p>
            <SignInButton mode="modal"><button className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 text-sm font-black text-white shadow-sm transition hover:brightness-95">Open your passport <ArrowRight className="h-4 w-4" /></button></SignInButton>
          </div>
          <PassportArtwork year={undefined} eventCount={0} cityCount={0} categoryCount={0} />
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="passport-page safe-x min-h-screen overflow-x-hidden bg-[#fffaf7] text-zinc-950">
      <DiscoveryNav />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 h-[560px] overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-orange-200/35 blur-[130px]" />
        <div className="absolute -right-40 top-24 h-96 w-96 rounded-full bg-pink-200/35 blur-[140px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-7 lg:px-8 lg:pb-20 lg:pt-12">
        <header className="grid gap-8 rounded-[2rem] border border-orange-100 bg-gradient-to-br from-white via-[#fff7f1] to-[#fff0f4] p-6 shadow-[0_18px_60px_-45px_rgba(124,45,18,0.32)] sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-4 lg:p-12">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-800"><Sparkles className="h-3.5 w-3.5" /> Your FunctionHour story</p>
            <h1 className="mt-5 text-4xl font-black leading-[0.96] tracking-[-0.06em] text-zinc-950 sm:text-6xl">A year worth<br className="hidden sm:block" /> remembering.</h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-600 sm:text-base sm:leading-7">Every ticket is a little doorway back to a night out, a new favorite, or a story you still tell. Here are the moments you collected.</p>
            {activeYear && <p className="mt-5 text-xs font-bold text-zinc-500">Looking back at <span className="font-black text-zinc-900">{activeYear}</span><span className="mx-2 text-orange-400">/</span>{yearEvents.length} {yearEvents.length === 1 ? "event" : "events"} in your collection</p>}
          </div>
          <PassportArtwork year={activeYear} eventCount={yearEvents.length} cityCount={cityCount} categoryCount={categoryCount} />
        </header>

        {tickets === undefined ? (
          <div className="mt-7 rounded-3xl border border-zinc-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-700"><TicketCheck className="h-6 w-6" /></div>
            <p className="mt-4 text-sm font-semibold text-zinc-600">Gathering your event stamps…</p>
          </div>
        ) : yearEvents.length === 0 ? (
          <section className="mt-7 grid overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm md:grid-cols-[0.8fr_1.2fr]">
            <div className="relative min-h-[220px] overflow-hidden bg-gradient-to-br from-orange-100 via-rose-50 to-violet-100 md:min-h-[320px]">
              <div aria-hidden="true" className="absolute -left-10 top-10 h-56 w-56 rounded-full border border-orange-300/50" />
              <div aria-hidden="true" className="absolute left-6 top-24 h-40 w-40 rounded-full border border-dashed border-orange-400/60" />
              <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-[-9deg] place-items-center rounded-full border-2 border-dashed border-orange-500 bg-white/80 text-orange-700 shadow-lg"><TicketCheck className="h-9 w-9" /></div>
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-800">Your first stamp is waiting</p>
              <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-zinc-950 sm:text-4xl">Make a memory worth keeping.</h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-600">Once you’ve attended an event, its ticket will find a place here. Start with something that sounds like you.</p>
              <Link href="/events" className="mt-6 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-5 text-sm font-black text-white shadow-sm transition hover:brightness-95">Find your next event <ArrowUpRight className="h-4 w-4" /></Link>
            </div>
          </section>
        ) : (
          <>
            <section aria-label="Your year in events" className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(124,45,18,0.38)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><TicketCheck className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Events attended</p><p className="mt-1 text-2xl font-black leading-none text-zinc-950">{yearEvents.length}</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(124,45,18,0.38)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700"><MapPinned className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Places explored</p><p className="mt-1 truncate text-xl font-black leading-none text-zinc-950">{cityCount ? cityCount + (cityCount === 1 ? " city" : " cities") : "—"}</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_12px_32px_-28px_rgba(124,45,18,0.38)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Sparkles className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Your top scene</p><p className="mt-1 truncate text-xl font-black leading-none text-zinc-950">{highlights.category}</p></div>
              </div>
            </section>

            <div className="mb-5 mt-11 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-800">The good times archive</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-zinc-950 sm:text-3xl">{activeYear} in moments</h2>
                <p className="mt-1 text-sm text-zinc-600">A collection made one plan, one night, one ticket at a time.</p>
              </div>
              {years.length > 0 && (
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Choose a passport year">
                  {years.map((year) => (
                    <button key={year} type="button" aria-pressed={year === activeYear} onClick={() => setSelectedYear(year)} className={year === activeYear ? "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-orange-300 bg-orange-100 px-4 text-xs font-black text-orange-950 shadow-sm" : "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 transition hover:border-orange-300 hover:text-orange-800"}>
                      <CalendarDays className={year === activeYear ? "h-4 w-4 text-orange-900" : "h-4 w-4 text-zinc-700"} strokeWidth={2.5} />{year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {yearEvents.map(({ event, imageUrl, date, tickets: count, checkedIn }) => {
                const image = imageUrl;
                const place = getCity(event) || event.location || "A night out";
                return (
                  <Link key={String(event._id)} href={"/events/" + event._id} className="group overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_12px_36px_-28px_rgba(24,24,27,0.34)] transition duration-200 hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_24px_50px_-32px_rgba(234,88,12,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">
                    <div className="relative aspect-[1.65/1] overflow-hidden bg-gradient-to-br from-orange-100 via-rose-50 to-violet-100">
                      {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : (
                        <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
                          <div className="absolute -right-8 -top-10 h-48 w-48 rounded-full border border-orange-300/60" />
                          <div className="absolute -right-1 -top-3 h-36 w-36 rounded-full border border-dashed border-orange-400/60" />
                          <div className="grid h-20 w-20 rotate-[-8deg] place-items-center rounded-full border-2 border-dashed border-orange-500 bg-white/80 text-orange-700 shadow-md"><TicketCheck className="h-8 w-8" /></div>
                        </div>
                      )}
                      {image && <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />}
                      <div className="absolute left-4 top-4 rounded-xl border border-white/75 bg-white/95 px-3 py-2 text-center shadow-sm backdrop-blur">
                        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-orange-800">{formatMonth(date)}</span>
                        <span className="mt-0.5 block text-xl font-black leading-none text-zinc-950">{new Date(date).getDate()}</span>
                      </div>
                      <span className={checkedIn ? "absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-[10px] font-black text-emerald-800 shadow-sm" : "absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/95 px-3 py-1.5 text-[10px] font-black text-orange-800 shadow-sm"}>
                        <TicketCheck className="h-4 w-4 shrink-0" strokeWidth={2.5} />{checkedIn ? "Checked in" : "In your history"}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600"><MapPin className="h-4 w-4 shrink-0 text-orange-700" strokeWidth={2.5} /><span className="truncate">{place}</span></div>
                      <h3 className="mt-2 line-clamp-2 text-xl font-black leading-snug tracking-[-0.025em] text-zinc-950">{event.name || "Untitled event"}</h3>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                        <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{event.category || "Experience"}</span>
                        <span className="shrink-0 text-xs font-semibold text-zinc-600">{formatLongDate(date)}</span>
                      </div>
                      {count > 1 && <p className="mt-2 text-xs font-medium text-zinc-500">{count} tickets for this event</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">Your passport reflects past tickets in your account. “Checked in” means your ticket was scanned; other entries are from your ticket history.</p>
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
