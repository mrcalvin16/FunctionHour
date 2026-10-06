"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import DiscoveryNav from "@/components/DiscoveryNav";

function EventImage({ storageId, directImageUrl }: { storageId?: Id<"_storage">; directImageUrl?: string | null }) {
  const storedImageUrl = useQuery(
    api.events.getImageUrl,
    !directImageUrl && storageId ? { storageId } : "skip"
  );
  const imageUrl = directImageUrl || storedImageUrl;

  if (!directImageUrl && !storageId) {
    return (
      <div className="flex h-56 items-center justify-center bg-zinc-900 text-zinc-500">
        No Image
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex h-56 items-center justify-center bg-zinc-900 text-zinc-500">
        Loading image...
      </div>
    );
  }

  return (
    <div className="relative h-56 w-full overflow-hidden">
      <Image src={imageUrl} alt="Event image" fill className="object-cover" />
    </div>
  );
}

export default function SavedEventsPage() {
  const savedEvents = useQuery(api.savedEvents.getSavedEvents);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-18%] top-[-10%] h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
        <div className="absolute right-[-18%] top-[18%] h-[420px] w-[420px] rounded-full bg-violet-500/15 blur-[120px]" />
      </div>
      <DiscoveryNav />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-400">
          Your Collection
        </p>

        <h1 className="mt-3 text-2xl sm:text-3xl sm:text-5xl font-black">
          Saved Events
        </h1>

        <p className="mt-4 max-w-2xl text-zinc-400">
          Keep track of events you want to come back to.
        </p>

        {savedEvents === undefined ? (
          <div className="mt-12 text-zinc-400">Loading saved events...</div>
        ) : savedEvents.length === 0 ? (
          <div className="mt-12 rounded-[1.5rem] sm:rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center">
            <h2 className="text-2xl font-bold">No saved events yet</h2>

            <p className="mt-3 text-zinc-500">
              Browse events and tap Save to build your list.
            </p>

            <Link
              href="/events"
              className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-black"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:p-8 sm:grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 lg:grid-cols-3">
            {savedEvents.map((event) => (
              <Link
                key={event!._id}
                href={`/events/${event!._id}`}
                className="overflow-hidden rounded-[1.5rem] sm:rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:border-orange-400/50"
              >
                <EventImage storageId={event!.imageStorageId} directImageUrl={event!.imageUrl} />

                <div className="p-4 sm:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase text-zinc-400">
                      Saved
                    </span>

                    <span className="text-sm text-zinc-500">
                      {event!.dateString}
                    </span>
                  </div>

                  <h2 className="line-clamp-1 text-2xl font-bold">
                    {event!.name}
                  </h2>

                  <p className="mt-3 line-clamp-2 text-sm text-zinc-400">
                    {event!.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-zinc-400">
                      {event!.location}
                    </p>

                    <p className="text-lg font-bold">
                      ${event!.price ?? 0}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
