"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LocateFixed, MapPin, Sparkles } from "lucide-react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
  type ViewState,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useLocalMapStyle } from "@/lib/useLocalMapStyle";
import { getBuyerPriceLabel } from "@/app/events/eventPresentation";

export type MapEvent = {
  _id: string;
  name?: string;
  description?: string;
  category?: string;
  location?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  dateString?: string;
  eventDate?: number;
  price?: number;
  startingPrice?: number;
  imageUrl?: string | null;
};

export type TimeMode = "all" | "tonight" | "weekend";

const DEFAULT_VIEW: ViewState = {
  longitude: -90.0715,
  latitude: 29.9511,
  zoom: 10,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

const timestamp = (event: MapEvent) =>
  event.eventDate ?? (event.dateString ? Date.parse(event.dateString) : NaN);

function formatDate(event: MapEvent) {
  const raw = timestamp(event);
  if (!Number.isFinite(raw)) return event.dateString || "Date coming soon";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(raw));
}

function locationLabel(event: MapEvent) {
  return (
    event.venueName ||
    event.venueAddress ||
    [event.city, event.state].filter(Boolean).join(", ") ||
    event.location ||
    "Location coming soon"
  );
}

function validCoordinates(event: Pick<MapEvent, "latitude" | "longitude">) {
  return Number.isFinite(event.latitude) && Number.isFinite(event.longitude) &&
    Math.abs(Number(event.latitude)) <= 90 && Math.abs(Number(event.longitude)) <= 180 &&
    !(Number(event.latitude) === 0 && Number(event.longitude) === 0);
}

function geocodeQuery(event: MapEvent) {
  const locality = [event.city, event.state].filter(Boolean).join(", ");
  return event.venueAddress
    ? [event.venueAddress, locality].filter(Boolean).join(", ")
    : locality || event.location?.trim() || "";
}

function matchesTime(event: MapEvent, mode: TimeMode) {
  if (mode === "all") return true;
  const raw = timestamp(event);
  if (!Number.isFinite(raw)) return false;
  const date = new Date(raw);
  const now = new Date();
  if (mode === "tonight") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + ((5 - start.getDay() + 7) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return date >= start && date < end;
}

export default function MapCanvas({
  events = [],
  timeMode,
  onAvailabilityChange,
}: {
  events: MapEvent[];
  timeMode: TimeMode;
  onAvailabilityChange?: (available: boolean | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [mapSupported, setMapSupported] = useState<boolean | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [lookedUp, setLookedUp] = useState<Record<string, { latitude: number; longitude: number } | null>>({});
  const mapRef = useRef<MapRef>(null);
  const { appearance, mapStyle } = useLocalMapStyle();

  const visibleEvents = useMemo(
    () => events.filter((event) => matchesTime(event, timeMode)),
    [events, timeMode],
  );
  const mappedEvents = useMemo(() => visibleEvents
    .map((event) => validCoordinates(event) ? event : lookedUp[event._id]
      ? { ...event, ...lookedUp[event._id], approximateLocation: true }
      : null)
    .filter((event): event is MapEvent & { approximateLocation?: boolean } => event !== null),
  [visibleEvents, lookedUp]);
  const selectedEvent =
    mappedEvents.find((event) => event._id === selectedId) ?? null;
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Older events may have an address but no stored coordinates. Resolve those
  // public locations without changing organizer data; the event strip remains
  // usable when an address cannot be resolved.
  useEffect(() => {
    if (!mapboxToken || mapSupported === false) return;
    const missing = visibleEvents.filter((event) => !validCoordinates(event) &&
      !(event._id in lookedUp) && geocodeQuery(event));
    if (!missing.length) return;
    const controller = new AbortController();
    Promise.all(missing.map(async (event) => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geocodeQuery(event))}.json?access_token=${encodeURIComponent(mapboxToken)}&limit=1&country=us`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return [event._id, null] as const;
        const data = await response.json();
        const [longitude, latitude] = data.features?.[0]?.center ?? [];
        return [event._id, validCoordinates({ latitude, longitude }) ? { latitude, longitude } : null] as const;
      } catch {
        return [event._id, null] as const;
      }
    })).then((results) => {
      if (!controller.signal.aborted) setLookedUp((current) => ({ ...current, ...Object.fromEntries(results) }));
    });
    return () => controller.abort();
  }, [visibleEvents, lookedUp, mapboxToken, mapSupported]);

  useEffect(() => {
    if (!mapLoaded || mappedEvents.length === 0) return;
    const bounds = mappedEvents.reduce(
      (acc, event) => ({
        west: Math.min(acc.west, Number(event.longitude)),
        east: Math.max(acc.east, Number(event.longitude)),
        south: Math.min(acc.south, Number(event.latitude)),
        north: Math.max(acc.north, Number(event.latitude)),
      }),
      { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity },
    );
    mapRef.current?.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], {
      padding: { top: 180, bottom: 205, left: window.innerWidth >= 640 ? 440 : 35, right: 50 },
      maxZoom: 11,
      duration: 650,
    });
  }, [mapLoaded, mappedEvents]);

  useEffect(() => {
    onAvailabilityChange?.(!mapboxToken ? false : mapSupported);
  }, [mapSupported, mapboxToken, onAvailabilityChange]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    const context = (canvas.getContext("webgl2", options) ||
      canvas.getContext("webgl", options)) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;

    setMapSupported(Boolean(context));
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }, []);

  const focusEvent = (event: MapEvent) => {
    setSelectedId(event._id);
    setViewState((current) => ({
      ...current,
      longitude: Number(event.longitude),
      latitude: Number(event.latitude),
      zoom: Math.max(current.zoom, 12),
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setViewState((current) => ({
          ...current,
          longitude: coords.longitude,
          latitude: coords.latitude,
          zoom: 12,
        }));
        setLocationStatus("idle");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (!mapboxToken || mapSupported === false) {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_75%_20%,#352059,#111018_60%)] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-orange-400/20 bg-black/65 p-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
            Map unavailable
          </p>
          <h2 className="mt-3 text-2xl font-black">Explore the event trail</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            The interactive map is unavailable here. Browse every matching event below.
          </p>
          <div className="mt-5 max-h-[40dvh] space-y-2 overflow-y-auto text-left">
            {visibleEvents.map((event) => <Link key={event._id} href={`/events/${event._id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-3 text-sm font-bold text-white hover:border-orange-300"><span><span className="block">{event.name || "Untitled event"}</span><span className="block text-xs font-normal text-zinc-300">{locationLabel(event)} · {getBuyerPriceLabel(event)}</span></span><ArrowUpRight className="h-4 w-4 shrink-0" /></Link>)}
            {visibleEvents.length === 0 && <p className="text-center text-sm text-zinc-300">No matching events.</p>}
          </div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/events"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black"
          >
            Browse event list
          </a>
        </div>
      </div>
    );
  }

  if (mapSupported === null) {
    return <div className="h-full bg-zinc-100" aria-label="Loading map" />;
  }

  return (
    <div className={`relative h-full overflow-hidden ${appearance === "light" ? "bg-zinc-100" : "bg-zinc-950"}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onLoad={() => setMapLoaded(true)}
        onMove={(event) => setViewState(event.viewState)}
        onClick={() => setSelectedId(null)}
        onError={(event) => {
          const message = String(event.error?.message ?? event.error ?? "");
          if (/webgl|context/i.test(message)) setMapSupported(false);
        }}
        mapboxAccessToken={mapboxToken}
        mapStyle={mapStyle}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {mappedEvents.map((event) => {
          const active = selectedId === event._id;
          return (
            <Marker
              key={event._id}
              longitude={Number(event.longitude)}
              latitude={Number(event.latitude)}
              anchor="bottom"
            >
              <button
                type="button"
                aria-label={`Show ${event.name || "event"}`}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  focusEvent(event);
                }}
                className={`group relative flex min-h-11 items-center gap-2 rounded-full border border-white/70 px-3 text-white shadow-[0_8px_32px_rgba(0,0,0,.38)] transition hover:scale-105 ${active ? "bg-violet-600" : "bg-[#ff5b35]"}`}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
                <span className="max-w-32 truncate text-xs font-black">{event.name || "Event"}</span>
              </button>
            </Marker>
          );
        })}

        {selectedEvent && (
          <Popup
            className="functionhour-map-popup"
            longitude={Number(selectedEvent.longitude)}
            latitude={Number(selectedEvent.latitude)}
            anchor="top"
            offset={14}
            closeOnClick={false}
            onClose={() => setSelectedId(null)}
            maxWidth="320px"
          >
            <article className="overflow-hidden rounded-2xl bg-zinc-950 text-white">
              {selectedEvent.imageUrl && (
                <img
                  src={selectedEvent.imageUrl}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              )}
              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                  {formatDate(selectedEvent)}
                </p>
                <h2 className="mt-2 line-clamp-2 text-lg font-black">
                  {selectedEvent.name || "Untitled event"}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                  {locationLabel(selectedEvent)}
                </p>
                {selectedEvent.approximateLocation && <p className="mt-1 text-xs text-orange-200">Approximate location · confirm venue on event page</p>}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">
                    {getBuyerPriceLabel(selectedEvent)}
                  </span>
                  <Link
                    href={`/events/${selectedEvent._id}`}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-black"
                  >
                    View event
                  </Link>
                </div>
              </div>
            </article>
          </Popup>
        )}
      </Map>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,rgba(255,96,55,.12),transparent_32%),linear-gradient(to_bottom,rgba(20,14,35,.12),transparent_35%)]" />

      <button
        type="button"
        onClick={useMyLocation}
        className="absolute bottom-44 right-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/85 px-4 text-xs font-black text-white shadow-xl backdrop-blur-xl hover:bg-zinc-900 sm:bottom-44 sm:right-5"
      >
        <LocateFixed
          className={`h-4 w-4 ${locationStatus === "loading" ? "animate-pulse text-orange-300" : ""}`}
          aria-hidden="true"
        />
        {locationStatus === "loading"
          ? "Locating…"
          : locationStatus === "error"
            ? "Location blocked"
            : "Near me"}
      </button>

      {visibleEvents.length === 0 && (
        <div className="absolute inset-x-3 bottom-36 z-10 rounded-2xl border border-white/10 bg-black/85 p-4 text-center text-sm text-zinc-300 backdrop-blur-xl sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm">
          No events match these filters. Try another category, date, or location.
        </div>
      )}

      {visibleEvents.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-[#120f1b]/90 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(25,15,40,.35)] backdrop-blur-xl sm:px-5">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-200"><Sparkles className="h-3.5 w-3.5" /> The event trail <span className="ml-auto text-zinc-300">{visibleEvents.length} found</span></div>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
          {visibleEvents.map((event) => (
            <button
              key={event._id}
              type="button"
              onClick={() => {
                const mapped = mappedEvents.find((item) => item._id === event._id);
                if (mapped) focusEvent(mapped);
                else window.location.assign(`/events/${event._id}`);
              }}
              className={`min-w-[220px] max-w-[260px] flex-1 rounded-2xl border p-3 text-left transition hover:border-orange-300 ${selectedId === event._id ? "border-orange-400 bg-orange-500/20" : "border-white/15 bg-white/[0.07]"}`}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                {formatDate(event)}
              </p>
              <p className="mt-1 line-clamp-1 font-black text-white">
                {event.name || "Untitled event"}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                {locationLabel(event)}
              </p>
              <p className="mt-2 flex items-center justify-between text-xs font-bold text-white"><span>{getBuyerPriceLabel(event)}</span><span className="flex items-center text-orange-200">{mappedEvents.some((item) => item._id === event._id) ? "Show pin" : "View event"}<ArrowUpRight className="ml-1 h-3 w-3" /></span></p>
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
