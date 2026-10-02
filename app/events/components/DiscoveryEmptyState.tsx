"use client";

import OrganizerPortalLink from "@/components/OrganizerPortalLink";
import { MapPin } from "lucide-react";

export default function DiscoveryEmptyState({ city, onReset }: {
  city: string;
  onReset: () => void;
}) {
  const hasCity = city !== "All Cities";
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-8 sm:px-7 lg:px-8">
      <div className="rounded-3xl border border-violet-200 bg-white px-5 py-8 text-center shadow-sm sm:px-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-800">
          <MapPin className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
          {hasCity ? `No events found in ${city}.` : "No events match your search."}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-700 sm:text-base">
          {hasCity ? "Your city belongs here. Have something planned? Host an event and bring your community together." : "Try different filters, or bring your own experience to Function Hour."}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <OrganizerPortalLink organizerLabel="Host an event" attendeeLabel="Host an event" organizerHref="/host/create" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 text-sm font-bold text-white transition hover:brightness-110" />
          <button type="button" onClick={onReset} className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50">Browse all events</button>
        </div>
      </div>
    </section>
  );
}
