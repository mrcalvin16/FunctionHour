"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LocateFixed, MapPin, Route } from "lucide-react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
  type ViewState,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { getFromPriceLabel } from "@/app/events/eventPresentation";

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
  loading = false,
  timeMode,
  onAvailabilityChange,
}: {
  events: MapEvent[];
  loading?: boolean;
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
      padding: { top: 180, bottom: 48, left: window.innerWidth >= 640 ? 440 : 35, right: 50 },
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
      <div className="flex h-full items-center justify-center overflow-y-auto bg-[radial-gradient(circle_at_70%_25%,#eee8ff,#f9fafb_55%)] p-6">
        <div className="w-full max-w-xl rounded-3xl border border-violet-200 bg-white/95 p-6 text-center shadow-xl shadow-violet-100">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-700">
            Map unavailable
          </p>
          <h2 className="mt-3 text-2xl font-black">Explore the event trail</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The interactive map is unavailable here. Browse every matching event below.
          </p>
          <div className="mt-5 max-h-[40dvh] space-y-2 overflow-y-auto text-left">
            {[...visibleEvents].sort((a, b) => (timestamp(a) || 0) - (timestamp(b) || 0)).map((event) => (
              <div key={event._id} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-700 text-white shadow-sm">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <Link href={`/events/${event._id}`} className="flex min-h-16 flex-1 items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-violet-50/40 p-3 text-sm font-bold text-zinc-950 hover:border-violet-400">
                  <span><span className="block">{event.name || "Untitled event"}</span><span className="block text-xs font-normal text-zinc-600">{locationLabel(event)} · {getFromPriceLabel(event)}</span></span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-violet-700" />
                </Link>
              </div>
            ))}
            {loading && <p role="status" className="text-center text-sm text-zinc-700">Loading upcoming events…</p>}
            {!loading && visibleEvents.length === 0 && <p className="text-center text-sm text-zinc-600">No events are available for this selection. Browse the event directory for all upcoming events.</p>}
          </div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/events"
            className="fh-map-inverse mt-5 inline-flex rounded-full bg-violet-700 px-5 py-3 text-sm font-black text-white"
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
    <div className="functionhour-map-canvas relative h-full overflow-hidden bg-[#f8fafc]">
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
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
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
                title={event.name || "Show event"}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  focusEvent(event);
                }}
                className={`group relative grid h-11 w-11 place-items-center rounded-full border-2 border-white shadow-[0_5px_20px_rgba(64,30,120,.35)] transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${active ? "bg-violet-700" : "bg-[#e94d28]"}`}
              >
                <MapPin className="h-7 w-7 fill-white/20 text-white" aria-hidden="true" />
                <span aria-hidden="true" className="absolute left-1/2 top-[11px] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white" />
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
            <article className="overflow-hidden rounded-2xl bg-white text-zinc-950">
              {selectedEvent.imageUrl && (
                <img
                  src={selectedEvent.imageUrl}
                  alt=""
                  className="h-32 w-full object-cover"
                />
              )}
              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                  {formatDate(selectedEvent)}
                </p>
                <h2 className="mt-2 line-clamp-2 text-lg font-black">
                  {selectedEvent.name || "Untitled event"}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                  {locationLabel(selectedEvent)}
                </p>
                {selectedEvent.approximateLocation && <p className="mt-1 text-xs font-medium text-orange-700">Approximate location · confirm venue on event page</p>}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold">
                    {getFromPriceLabel(selectedEvent)}
                  </span>
                  <Link
                    href={`/events/${selectedEvent._id}`}
                    className="fh-map-inverse rounded-full bg-violet-700 px-4 py-2 text-xs font-black text-white"
                  >
                    View event
                  </Link>
                </div>
              </div>
            </article>
          </Popup>
        )}
      </Map>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,rgba(255,96,55,.07),transparent_34%)]" />

      <button
        type="button"
        onClick={useMyLocation}
        className="absolute bottom-5 right-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-4 text-xs font-black text-zinc-950 shadow-lg backdrop-blur-xl hover:bg-violet-50 sm:bottom-5 sm:right-5"
      >
        <LocateFixed
          className={`h-4 w-4 ${locationStatus === "loading" ? "animate-pulse text-violet-700" : ""}`}
          aria-hidden="true"
        />
        {locationStatus === "loading"
          ? "Locating…"
          : locationStatus === "error"
            ? "Location blocked"
            : "Near me"}
      </button>

      {!loading && visibleEvents.length === 0 && (
        <div className="absolute inset-x-3 bottom-5 z-10 rounded-2xl border border-zinc-200 bg-white/95 p-4 text-center text-sm text-zinc-700 shadow-lg backdrop-blur-xl sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm">
          No events match these filters. Try another category, date, or location.
        </div>
      )}


    </div>
  );
}
