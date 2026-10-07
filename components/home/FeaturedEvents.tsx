"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useStorageUrl } from "@/lib/utils";
import { getTicketListingLabel, type DiscoveryEvent } from "@/app/events/eventPresentation";

export default function FeaturedEvents() {
  const events = useQuery(api.events.getAll);
  const featuredEvents = events?.slice(0, 6) ?? [];

  if (events === undefined) {
    return (
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-[360px] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />)}
      </div>
    );
  }

  if (featuredEvents.length === 0) {
    return (
      <div className="mt-10 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
        <p className="text-xl font-black">The next function is loading up.</p>
        <Link href="/host/create" className="mt-5 inline-flex rounded-full bg-white px-6 py-3 font-black text-black">Host the first event</Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {featuredEvents.map((event) => <FeaturedEventCard key={event._id} event={event} />)}
    </div>
  );
}

function FeaturedEventCard({ event }: { event: DiscoveryEvent }) {
  const imageUrl = useStorageUrl(event.imageStorageId);

  return (
    <Link href={`/events/${event._id}`} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/40 transition duration-300 hover:-translate-y-1 hover:border-violet-400/45">
      <div className="relative h-60 overflow-hidden bg-gradient-to-br from-orange-600/50 via-zinc-900 to-violet-700/50">
        {imageUrl && <Image src={imageUrl} alt={event.name || "Event image"} fill className="object-cover transition duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <span className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/65 px-3 py-1.5 text-xs font-black backdrop-blur">{event.category || "Experience"}</span>
        <div className="absolute inset-x-5 bottom-5">
          <h3 className="line-clamp-2 text-2xl font-black leading-tight">{event.name || "Untitled Event"}</h3>
          <p className="mt-2 truncate text-sm text-white/65">{event.location || event.venueName || "Location coming soon"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Tickets</p>
          <p className="mt-1 text-xl font-black">{getTicketListingLabel(event)}</p>
        </div>
        <span className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition group-hover:bg-orange-300">View Event</span>
      </div>
    </Link>
  );
}
