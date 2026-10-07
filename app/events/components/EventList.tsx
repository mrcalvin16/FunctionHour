"use client";

import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import EventImage from "./EventImage";
import {
  formatEventDate,
  getTicketListingLabel,
  getEventCategory,
  getEventLocation,
  getEventTimestamp,
  type DiscoveryEvent,
} from "../eventPresentation";

export default function EventList({
  events,
  savedEventIds,
  onToggleSave,
}: {
  events: DiscoveryEvent[];
  savedEventIds: Id<"events">[];
  onToggleSave: (eventId: Id<"events">) => void;
}) {
  return (
    <section id="event-results" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 pb-16 pt-8 sm:px-7 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Event directory</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">Upcoming events</h2>
        </div>
        <p aria-live="polite" className="text-sm font-semibold text-zinc-600">
          {events.length} event{events.length === 1 ? "" : "s"} found
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div aria-hidden="true" className="hidden grid-cols-[88px_112px_minmax(0,1.5fr)_minmax(0,1fr)_190px] gap-5 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-600 lg:grid">
          <span>Date</span><span>Image</span><span>Event</span><span>Location</span><span>Price</span>
        </div>
        <div className="divide-y divide-zinc-200">
          {events.map((event) => {
            const timestamp = getEventTimestamp(event);
            const hasDate = Number.isFinite(timestamp);
            const date = hasDate ? new Date(timestamp) : null;
            const price = getTicketListingLabel(event);
            const isSaved = savedEventIds.includes(event._id);
            const href = `/events/${event._id}`;

            return (
              <article key={event._id} className="group grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 p-4 transition hover:bg-orange-50/50 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5 sm:p-5 lg:grid-cols-[88px_112px_minmax(0,1.5fr)_minmax(0,1fr)_190px]">
                <div className="hidden text-center lg:block">
                  <span className="block text-[11px] font-black uppercase tracking-widest text-violet-700">
                    {date ? new Intl.DateTimeFormat("en-US", { month: "short" }).format(date) : "Date"}
                  </span>
                  <span className="block text-3xl font-black leading-none text-zinc-950">
                    {date ? date.getDate() : "—"}
                  </span>
                </div>

                <Link href={href} tabIndex={-1} aria-hidden="true" className="block h-[88px] overflow-hidden rounded-xl bg-zinc-900 sm:h-[112px]">
                  <EventImage storageId={event.imageStorageId} imageUrl={event.imageUrl} className="h-full" alt="" />
                </Link>

                <div className="min-w-0 self-center">
                  <p className="text-xs font-bold text-violet-700 lg:hidden">{formatEventDate(event)}</p>
                  <Link href={href} className="mt-1 block text-lg font-black leading-tight text-zinc-950 transition hover:text-orange-700 sm:text-xl">
                    {event.name || "Untitled event"}
                  </Link>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">{getEventCategory(event)}</p>
                  <p className="mt-2 truncate text-sm text-zinc-600 lg:hidden">{getEventLocation(event)}</p>
                  <p className="mt-2 text-sm font-black text-zinc-950 lg:hidden">{price}</p>
                </div>

                <p className="hidden min-w-0 text-sm font-medium text-zinc-700 lg:block">{getEventLocation(event)}</p>

                <div className="col-span-2 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 lg:col-span-1 lg:justify-end lg:border-0 lg:pt-0">
                  <p className="hidden text-sm font-black text-zinc-950 lg:block">{price}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={isSaved ? `Remove ${event.name || "event"} from saved` : `Save ${event.name || "event"}`}
                      aria-pressed={isSaved}
                      onClick={() => onToggleSave(event._id)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-zinc-300 text-xl text-zinc-900 transition hover:border-violet-500"
                    >
                      {isSaved ? "♥" : "♡"}
                    </button>
                    {event.hasMerch && (
                      <Link href={`${href}/merch`} className="inline-flex min-h-10 items-center rounded-full border border-zinc-300 bg-white px-3 text-xs font-black text-zinc-900 transition hover:border-orange-400 hover:text-orange-800">
                        Shop merch
                      </Link>
                    )}
                    <Link href={href} className="inline-flex min-h-10 items-center rounded-full bg-zinc-950 px-4 text-xs font-black text-white transition hover:bg-zinc-800">
                      View event <span aria-hidden="true" className="ml-2">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
