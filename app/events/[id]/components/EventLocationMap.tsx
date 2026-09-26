"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import Link from "next/link";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { useLocalMapStyle } from "@/lib/useLocalMapStyle";

export default function EventLocationMap({ event }: {
  event: {
    latitude?: number;
    longitude?: number;
    venueName?: string;
    location?: string;
    city?: string;
    state?: string;
  };
}) {
  const { mapStyle } = useLocalMapStyle();
  const { latitude, longitude } = event;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
          Event Location
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          {event?.venueName || event?.location || "Venue TBA"}
        </h2>

        <p className="mt-2 text-sm text-white/50">
          {event?.city || "City"}
          {event?.state ? `, ${event.state}` : ""}
        </p>
      </div>

      <div className="h-[320px] w-full border-y border-white/10">
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{
            longitude,
            latitude,
            zoom: 13,
          }}
          mapStyle={mapStyle}
          scrollZoom={false}
        >
          <NavigationControl position="top-right" />

          <Marker
            longitude={longitude}
            latitude={latitude}
            anchor="bottom"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-black bg-white text-lg font-black text-black shadow-2xl">
              🎟
            </div>
          </Marker>
        </Map>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-6">
        <p className="text-sm text-white/45">
          Preview the area around this event.
        </p>

        <Link
          href="/map"
          className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
        >
          Open Full Map
        </Link>
      </div>
    </section>
  );
}
