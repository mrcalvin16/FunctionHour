"use client";

import { MapPin } from "lucide-react";

type Props = {
  location?: string;
  venueName?: string;
  city?: string;
  state?: string;
};

export default function EventLocationPreview({
  location,
  venueName,
  city,
  state,
}: Props) {
  const displayLocation =
    venueName || location || [city, state].filter(Boolean).join(", ");

  const encoded = encodeURIComponent(displayLocation || "");

  if (!displayLocation) return null;

  return (
    <section className="lg:mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
              Location
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-950">
              {displayLocation}
            </h2>
            {(city || state) && (
              <p className="mt-1 text-sm text-zinc-600">
                {[city, state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
        >
          Get directions
        </a>
      </div>
    </section>
  );
}
