"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type HostedEvent = {
  _id: Id<"events">;
  name: string;
  location: string;
  eventDate: number;
  dateString: string;
  imageUrl?: string | null;
  ticketsSold?: number;
  totalTickets?: number;
};

type ViewMode = "list" | "calendar";
type EventFilter = "all" | "upcoming" | "past";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function dayKey(value: number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function EventsWorkspacePage() {
  const { isSignedIn } = useUser();
  const events = useQuery(api.events.getMyEvents, isSignedIn ? {} : "skip") as
    | HostedEvent[]
    | undefined;
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [query, setQuery] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const normalizedQuery = query.trim().toLowerCase();

    return [...(events ?? [])]
      .filter((event) => {
        if (filter === "upcoming" && event.eventDate < now) return false;
        if (filter === "past" && event.eventDate >= now) return false;
        if (!normalizedQuery) return true;
        return `${event.name} ${event.location}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => a.eventDate - b.eventDate);
  }, [events, filter, query]);

  const counts = useMemo(() => {
    const now = Date.now();
    return {
      all: events?.length ?? 0,
      upcoming: events?.filter((event) => event.eventDate >= now).length ?? 0,
      past: events?.filter((event) => event.eventDate < now).length ?? 0,
    };
  }, [events]);

  if (isSignedIn === false) {
    return (
      <main className="p-6">
        <p className="text-zinc-400">Sign in to manage your events.</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-6">
      <section className="rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/85 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
              Event Operations
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Event Schedule
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Search your events, review the timeline, or open an event command
              center.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ViewButton
              active={view === "list"}
              onClick={() => setView("list")}
            >
              <LayoutList className="h-4 w-4" /> List
            </ViewButton>
            <ViewButton
              active={view === "calendar"}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" /> Calendar
            </ViewButton>
            <Link
              href="/host/create"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 px-4 text-xs font-black shadow-[0_0_24px_rgba(139,92,246,0.24)]"
            >
              <Plus className="h-4 w-4" /> Create Event
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["all", "upcoming", "past"] as EventFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`min-h-10 rounded-xl border px-4 text-xs font-black capitalize transition ${
                  filter === value
                    ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                    : "border-white/[0.08] bg-black/20 text-zinc-500 hover:text-white"
                }`}
              >
                {value} ({counts[value]})
              </button>
            ))}
          </div>

          <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3 lg:max-w-sm">
            <Search className="h-4 w-4 text-zinc-600" />
            <span className="sr-only">Search events</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events or venues"
              className="w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-500"
            />
          </label>
        </div>

        {events === undefined ? (
          <div className="mt-6 h-72 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025]" />
        ) : view === "calendar" ? (
          <CalendarView
            events={filteredEvents}
            visibleMonth={visibleMonth}
            onMonthChange={setVisibleMonth}
          />
        ) : (
          <EventList events={filteredEvents} />
        )}
      </section>
    </main>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black transition ${
        active
          ? "border-violet-400/40 bg-violet-500/15 text-white"
          : "border-white/[0.08] bg-black/20 text-zinc-500 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function EventList({ events }: { events: HostedEvent[] }) {
  if (events.length === 0) return <EmptyState />;

  return (
    <div className="mt-6 grid gap-3">
      {events.map((event) => (
        <article
          key={event._id}
          className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-violet-400/25 sm:flex-row sm:items-center"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-orange-500/20 text-violet-200">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black text-white">
              {event.name}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {formatDate(event.eventDate)}
            </p>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-zinc-600">
              <MapPin className="h-3 w-3" />{" "}
              {event.location || "Location pending"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/host/events/${event._id}/edit`}
              className="inline-flex min-h-10 items-center rounded-xl border border-white/10 px-3 text-xs font-black text-zinc-400 hover:text-white"
            >
              Edit
            </Link>
            <Link
              href={`/host/events/${event._id}`}
              className="inline-flex min-h-10 items-center rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-500"
            >
              Open →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function CalendarView({
  events,
  visibleMonth,
  onMonthChange,
}: {
  events: HostedEvent[];
  visibleMonth: Date;
  onMonthChange: (date: Date) => void;
}) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => index - firstDay + 1);
  const eventsByDay = new Map<string, HostedEvent[]>();
  const monthEvents = events.filter(
    (event) => monthKey(new Date(event.eventDate)) === monthKey(visibleMonth),
  );

  for (const event of events) {
    const date = new Date(event.eventDate);
    if (monthKey(date) !== monthKey(visibleMonth)) continue;
    const key = dayKey(date);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-4">
        <h3 className="text-lg font-black">
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
          }).format(visibleMonth)}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(startOfMonth(new Date()))}
            className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-black text-zinc-400 hover:text-white"
          >
            Today
          </button>
          <CalendarNavButton
            label="Previous month"
            onClick={() => onMonthChange(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </CalendarNavButton>
          <CalendarNavButton
            label="Next month"
            onClick={() => onMonthChange(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </CalendarNavButton>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/[0.07]">
        {weekdayLabels.map((day) => (
          <div
            key={day}
            className="px-1 py-3 text-center text-[11px] font-black uppercase tracking-wider text-zinc-600"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="hidden grid-cols-7 sm:grid">
        {cells.map((day, index) => {
          const inMonth = day >= 1 && day <= daysInMonth;
          const date = new Date(year, month, day);
          const dayEvents = inMonth
            ? (eventsByDay.get(dayKey(date)) ?? [])
            : [];
          const isToday = inMonth && dayKey(date) === dayKey(new Date());

          return (
            <div
              key={`${year}-${month}-${index}`}
              className={`min-h-24 border-b border-r border-white/[0.06] p-1.5 sm:min-h-32 sm:p-2 ${inMonth ? "bg-white/[0.01]" : "bg-black/20"}`}
            >
              {inMonth && (
                <>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${isToday ? "bg-orange-500 text-white" : "text-zinc-500"}`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Link
                        key={event._id}
                        href={`/host/events/${event._id}`}
                        title={`${event.name} — ${formatDate(event.eventDate)}`}
                        className="block truncate rounded-md border border-violet-400/20 bg-violet-500/15 px-1.5 py-1 text-[11px] font-bold text-violet-200 transition hover:bg-violet-500/25 sm:text-[10px]"
                      >
                        {event.name}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="px-1 text-[11px] text-zinc-600">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="divide-y divide-white/[0.07] sm:hidden">
        {monthEvents.length ? (
          monthEvents.map((event) => (
            <Link
              key={event._id}
              href={`/host/events/${event._id}`}
              className="flex items-center gap-3 p-4 transition hover:bg-white/[0.04]"
            >
              <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                <span className="text-[11px] font-black uppercase">
                  {new Intl.DateTimeFormat("en", { month: "short" }).format(
                    event.eventDate,
                  )}
                </span>
                <span className="text-base font-black leading-none">
                  {new Date(event.eventDate).getDate()}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">
                  {event.name}
                </span>
                <span className="mt-1 block truncate text-[11px] text-zinc-600">
                  {formatDate(event.eventDate)} ·{" "}
                  {event.location || "Location pending"}
                </span>
              </span>
              <span className="text-zinc-500">→</span>
            </Link>
          ))
        ) : (
          <div className="p-8 text-center text-xs text-zinc-600">
            No events scheduled this month.
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarNavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:text-white"
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-16 text-center">
      <CalendarDays className="mx-auto h-8 w-8 text-zinc-700" />
      <h3 className="mt-4 font-black text-white">No matching events</h3>
      <p className="mt-2 text-sm text-zinc-600">
        Change the filter or create a new event.
      </p>
    </div>
  );
}
