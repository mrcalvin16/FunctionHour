"use client";

import Link from "next/link";

export default function VenueSidebar({
  events,
}: {
  events: any[];
}) {
  const trendingEvents = [...events]
    .sort(
      (a, b) =>
        Number(b.ticketsSold ?? 0) -
        Number(a.ticketsSold ?? 0)
    )
    .slice(0, 3);

  return (
    <aside className="max-h-[calc(100vh-104px)] space-y-6 overflow-y-auto rounded-[2.25rem] border border-white/10 bg-black/55 p-4 backdrop-blur-xl">
      {/* Trending Tonight */}
      <section className="rounded-[2rem] border border-orange-500/20 bg-gradient-to-br from-orange-500/15 to-violet-500/10 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-800">
              Trending Tonight
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Popular Right Now
            </h2>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-xl">
            🔥
          </div>
        </div>

        <div className="space-y-4">
          {trendingEvents.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/50">
              No trending events yet.
            </div>
          )}

          {trendingEvents.map((event, index) => (
            <Link
              key={event._id}
              href={`/events/${event._id}`}
              className="block rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-orange-400/40 hover:bg-black/60"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-black text-black">
                  #{index + 1}
                </div>

                <div className="flex-1">
                  <h3 className="font-bold text-white">
                    {event.name}
                  </h3>

                  <p className="mt-1 text-sm text-white/55">
                    {event.venueName ||
                      event.location ||
                      "Venue TBA"}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-orange-800">
                    <span>
                      {event.city || "City"}
                    </span>

                    <span>•</span>

                    <span>
                      {event.ticketsSold ?? 0} attending
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Events Nearby */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            Events Nearby
          </h2>

          <p className="text-sm text-white/50">
            {events.length} events found
          </p>
        </div>

        {events.map((event) => (
          <Link
            key={event._id}
            href={`/events/${event._id}`}
            className="block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition hover:border-white/25 hover:bg-white/[0.07]"
          >
            {event.imageUrl ? (
              <img
                src={event.imageUrl}
                alt={event.name}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="flex h-44 items-center justify-center bg-white/[0.05] text-sm text-white/30">
                No image
              </div>
            )}

            <div className="p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  {event.city || "City TBA"}
                  {event.state ? `, ${event.state}` : ""}
                </p>

                <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
                  ${event.price ?? 0}
                </p>
              </div>

              <h3 className="text-lg font-extrabold text-white">
                {event.name}
              </h3>

              <p className="mt-2 text-sm text-white/55">
                {event.venueName ||
                  event.location ||
                  "Venue coming soon"}
              </p>

              {event.dateString && (
                <p className="mt-3 text-sm font-semibold text-white/75">
                  {event.dateString}
                </p>
              )}
            </div>
          </Link>
        ))}
      </section>
    </aside>
  );
}
