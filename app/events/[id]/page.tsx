"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ShareEventButton from "@/components/share/ShareEventButton";
import ContactOrganizer from "@/components/organizers/ContactOrganizer";
import { useMutation, useQuery } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import EventLocationPreview from "@/components/events/EventLocationPreview";
import EventAnnouncements from "@/components/events/EventAnnouncements";
import EventMerchSettings from "@/components/merch/EventMerchSettings";
import EventTalentBoundary from "@/components/events/EventTalentBoundary";
import { BadgeCheck, CalendarDays, MapPin, Ticket } from "lucide-react";

import type { Id } from "@/convex/_generated/dataModel";
import VenueRules from "@/components/functionhour/VenueRules";
import { getEventViewAttribution } from "@/lib/analytics/eventViewAttribution";
import { getPrivacyPreferences, PRIVACY_PREFERENCES_EVENT } from "@/lib/privacyPreferences";
import { attendeeVenue } from "@/lib/attendeeDisplay";
import { brandedMediaUrl } from "@/lib/brandedMediaUrl";
import { formatEventDate, getBuyerPriceLabel, getFromPriceLabel, isEventUpcoming } from "../eventPresentation";

function EventImage({
  storageId,
  imageUrl: directImageUrl,
  name,
}: {
  storageId?: Id<"_storage">;
  imageUrl?: string | null;
  name?: string;
}) {
  const imageUrl = useQuery(
    api.events.getImageUrl,
    !directImageUrl && storageId ? { storageId } : "skip",
  );
  const finalImageUrl = directImageUrl || imageUrl;

  if (!directImageUrl && !storageId) {
    return <div className="text-white/40">No Image</div>;
  }

  if (finalImageUrl === undefined) {
    return <div className="text-white/40">Loading image...</div>;
  }

  if (!finalImageUrl) {
    return <div className="text-white/40">Image unavailable</div>;
  }

  return (
    <div className="w-full">
      <a
        href={brandedMediaUrl(finalImageUrl) ?? finalImageUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={name ? `View full flyer for ${name}` : "View full event flyer"}
        className="group mx-auto block w-fit max-w-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-violet-500"
      >
        <img
          src={brandedMediaUrl(finalImageUrl) ?? finalImageUrl}
          alt={name ? `${name} event flyer` : "Event flyer"}
          className="mx-auto block h-auto max-h-[65vh] w-auto max-w-full rounded-sm object-contain shadow-[0_30px_90px_rgba(0,0,0,0.38)] transition-transform duration-500 group-hover:scale-[1.015] sm:max-h-[72vh]"
        />
        <span className="block px-4 py-3 text-center text-xs font-semibold tracking-wide text-white/75 transition group-hover:text-white">
          View full flyer ↗
        </span>
      </a>
    </div>
  );
}

function MerchImage({
  imageUrl,
  storageId,
  name,
}: {
  imageUrl?: string | null;
  storageId?: Id<"_storage">;
  name: string;
}) {
  const resolvedUrl = useQuery(
    api.events.getImageUrl,
    !imageUrl && storageId ? { storageId } : "skip",
  );

  const finalUrl = imageUrl || resolvedUrl;

  if (!imageUrl && !storageId) {
    return <span className="text-white/40">Merch Image</span>;
  }

  if (finalUrl === undefined) {
    return <span className="text-white/40">Loading image...</span>;
  }

  if (!finalUrl) {
    return <span className="text-white/40">Image unavailable</span>;
  }

  return (
    <img src={brandedMediaUrl(finalUrl) ?? finalUrl} alt={name} className="h-full w-full object-cover" />
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id as Id<"events">;

  async function copyText(value?: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    alert("Copied to clipboard.");
  }

  const { isLoaded, isSignedIn } = useUser();

  const event = useQuery(api.events.getById, { eventId });
  const [salesClock, setSalesClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSalesClock(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const eventAccess = useQuery(
    api.eventAccess.getMyEventAccess,
    isLoaded && isSignedIn ? { eventId } : "skip",
  );
  const canManageEvent =
    eventAccess?.capabilities.includes("manage_event") === true;
  const canManageTickets =
    eventAccess?.capabilities.includes("manage_tickets") === true;

  const myTickets = useQuery(
    api.tickets.getUserTickets,
    isLoaded && isSignedIn ? {} : "skip",
  );

  const merch = useQuery(api.merch.getStorefront, { eventId });
  const merchItems = merch?.products ?? [];

  const ticketTypes = useQuery(api.ticketTypes.getByEvent, { eventId });
  const ticketAddOns = useQuery(api.ticketAddOns.getByEvent, { eventId });

  const activeTicketTypes = useMemo(
    () => ticketTypes?.filter((ticket) => ticket.isActive !== false) ?? [],
    [ticketTypes],
  );
  const eventSoldOut = Boolean(event && (event.isSoldOut ||
    (event.totalTickets !== undefined && event.totalTickets > 0 && (event.ticketsSold ?? 0) >= event.totalTickets)));
  const allTicketTypesUnavailable = activeTicketTypes.length > 0 && activeTicketTypes.every((ticket) =>
    ticket.isSoldOut || ticket.salesPaused || (ticket.quantity !== undefined && (ticket.sold ?? 0) >= ticket.quantity));
  const allTicketTypesSoldOut = activeTicketTypes.length > 0 && activeTicketTypes.every((ticket) =>
    ticket.isSoldOut || (ticket.quantity !== undefined && (ticket.sold ?? 0) >= ticket.quantity));
  const salesState = !event || ticketTypes === undefined ? "loading" :
    event.eventStatus === "cancelled" ? "cancelled" :
    event.eventStatus === "postponed" ? "postponed" :
    !isEventUpcoming(event, salesClock) ? "ended" :
    eventSoldOut || allTicketTypesSoldOut ? "sold_out" :
    event.salesEndAt !== undefined && salesClock >= event.salesEndAt ? "deadline" :
    allTicketTypesUnavailable ? "unavailable" : "open";
  const salesOpen = salesState === "open";

  const startingPrice =
    ticketTypes === undefined
      ? null
      : activeTicketTypes.length > 0
        ? Math.min(...activeTicketTypes.map((ticket) => ticket.price))
        : (event?.price ?? 0);

  const savedCreative = useQuery(api.eventCreative.listPublishedByEvent, {
    eventId,
  });
  const announcements = useQuery(api.eventMessages.listPublishedForEvent, {
    eventId,
  });
  const organizerData = useQuery(
    api.organizers.getOrganizerByUserId,
    event?.userId ? { userId: event.userId } : "skip",
  );

  const trackView = useMutation(api.eventViews.trackEventView);
  const [privacyPreferencesRevision, setPrivacyPreferencesRevision] = useState(0);

  const alreadyPurchased = useMemo(() => {
    if (!myTickets || !event) return false;
    return myTickets.some((ticket) => ticket.eventId === event._id);
  }, [myTickets, event]);

  useEffect(() => {
    const refreshPrivacyPreferences = () => setPrivacyPreferencesRevision((revision) => revision + 1);
    window.addEventListener(PRIVACY_PREFERENCES_EVENT, refreshPrivacyPreferences);
    window.addEventListener("storage", refreshPrivacyPreferences);
    return () => {
      window.removeEventListener(PRIVACY_PREFERENCES_EVENT, refreshPrivacyPreferences);
      window.removeEventListener("storage", refreshPrivacyPreferences);
    };
  }, []);

  useEffect(() => {
    if (!event?._id || !getPrivacyPreferences().analytics) return;

    trackView({
      eventId: event._id,
      ...getEventViewAttribution(),
    }).catch(() => {});
  }, [event?._id, trackView, privacyPreferencesRevision]);

  if (event === undefined) {
    return (
      <main className="safe-x min-h-screen pb-28 sm:pb-0 bg-black px-4 py-6 sm:px-6 sm:py-10 text-white">
        Loading event...
        <div className="h-10 sm:hidden" />
      </main>
    );
  }

  if (!event) {
    return (
      <main className="safe-x min-h-screen bg-black px-4 py-6 sm:px-6 sm:py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl sm:text-3xl font-bold">Event not found</h1>
          <Link
            href="/events"
            className="mt-6 inline-block rounded-2xl sm:rounded-xl bg-white px-5 min-h-11 py-3.5 sm:py-3 font-semibold text-black"
          >
            Browse Events
          </Link>
        </div>
        <div className="h-10 sm:hidden" />
      </main>
    );
  }

  const eventDetails = event as typeof event & {
    entryPolicy?: string;
    reEntryPolicy?: string;
    isVenueVerified?: boolean;
  };
  const organizer = organizerData?.organizer;
  const organizerName =
    organizer?.organizerName || organizer?.name || "Organizer";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fcfbfa] text-zinc-900">
      
      <section className="relative mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          >
            ← All events
          </Link>
          <Link
            href="/"
            className="text-xs font-black tracking-[0.22em] text-zinc-900"
          >
            FUNCTION<span className="text-violet-700">HOUR</span>
          </Link>
        </div>

        {/* Scalable editorial masthead: all content comes from the event record. */}
        <header className="relative mb-7 mt-7 overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white px-6 py-8 shadow-[0_18px_70px_rgba(39,25,67,0.045)] sm:mb-9 sm:mt-10 sm:px-10 sm:py-11">
          <div className="relative z-10 mb-5 flex flex-wrap items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-violet-700" aria-hidden="true" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-800">{event.category || "Experience"}</span>
            <span className="h-px w-10 bg-zinc-300" aria-hidden="true" />
            <span className="text-[11px] font-medium tracking-wide text-zinc-500">A FunctionHour experience</span>
          </div>
          {event.isDemo && <p className="mb-3 inline-flex rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">Demo Event</p>}
          <h1 className="relative z-10 max-w-4xl text-[clamp(2.4rem,5vw,4.8rem)] font-black leading-[1.06] tracking-[-0.06em] text-zinc-950">{event.name}</h1>
          <div className="relative z-10 mt-8 grid gap-6 border-t border-zinc-100 pt-6 sm:grid-cols-2 lg:max-w-4xl">
            <EventSignalCard icon="date" label="Date & time" value={formatEventDate(event)} />
            <EventSignalCard icon="place" label="Location" value={attendeeVenue(event)} />
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.72fr)] lg:items-start lg:gap-9">
          <div className="contents lg:block">
            <div className="order-1 overflow-hidden">
              <div className="relative flex min-h-[340px] w-full items-center justify-center overflow-hidden rounded-[1.75rem] bg-[#19151f] px-5 py-10 shadow-[0_25px_75px_rgba(35,20,49,0.16)] sm:min-h-[470px] sm:px-10 sm:py-12">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(124,58,237,0.24),transparent_66%)]" />
                <div aria-hidden="true" className="pointer-events-none absolute left-6 top-6 text-[10px] font-bold uppercase tracking-[0.24em] text-white/45">The event / 01</div>
                <div className="relative z-10 w-full">
                <EventImage
                  storageId={event.imageStorageId}
                  imageUrl={event.imageUrl}
                  name={event.name}
                />
                </div>
              </div>
              {event.description && (
                <div className="mt-7 rounded-[1.5rem] border border-zinc-200 bg-white px-6 py-7 sm:px-8 sm:py-9">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700">Inside the experience</p>
                  <p className="max-w-3xl whitespace-pre-line text-base leading-8 sm:text-lg" style={{ color: "#3f3f46" }}>{event.description}</p>
                </div>
              )}
            </div>

            <div className="order-3 mt-7 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white p-6 sm:mt-9 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                    Hosted By
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight">
                      {organizerName}
                    </h2>
                    {organizer?.isVerifiedOrganizer && (
                      <span
                        role="img"
                        aria-label="Verified organizer"
                        title="Verified organizer"
                        className="inline-flex"
                      >
                        <BadgeCheck
                          aria-hidden="true"
                          className="h-6 w-6 shrink-0 fill-blue-500 text-blue-500 stroke-white"
                        />
                      </span>
                    )}
                  </div>
                  {organizer?.bio && (
                    <p className="mt-2 line-clamp-2 max-w-xl text-zinc-600">
                      {organizer.bio}
                    </p>
                  )}

                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-violet-100 text-xl font-black">
                  {organizer?.avatarUrl ? (
                    <img
                      src={brandedMediaUrl(organizer.avatarUrl) ?? organizer.avatarUrl}
                      alt={organizerName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    organizerName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {(canManageEvent || canManageTickets) && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {canManageEvent ? (
                    <Link
                      href={`/host/events/${event._id}/edit`}
                      className="rounded-2xl sm:rounded-xl border border-zinc-200 px-5 min-h-11 py-3.5 sm:py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-100"
                    >
                      Edit Event
                    </Link>
                  ) : null}

                  {canManageTickets ? (
                    <Link
                      href={`/host/events/${event._id}/tickets`}
                      className="rounded-2xl sm:rounded-xl bg-orange-500 px-5 min-h-11 py-3.5 sm:py-3 text-sm font-black text-black hover:bg-orange-400"
                    >
                      Ticket Setup
                    </Link>
                  ) : null}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={`/organizers/${event.userId}`}
                  className="inline-flex min-h-11 items-center text-sm font-bold text-violet-800 transition hover:text-violet-950"
                >
                  View Organizer Profile →
                </Link>
                {!event.isDemo && <ContactOrganizer organizerUserId={event.userId} organizerName={organizerName} eventId={event._id} appearance="light" />}
              </div>

              <div className="mt-6 sm:mt-8">
                <VenueRules
                  age={event.ageRequirement}
                  dressCode={event.dressCode}
                  parking={event.parkingInfo}
                  entryPolicy={event.entryNotes || eventDetails.entryPolicy}
                  refundPolicy={event.refundPolicy}
                  reEntry={eventDetails.reEntryPolicy}
                  isVerified={eventDetails.isVenueVerified === true}
                />
              </div>

              <EventAnnouncements announcements={announcements} />
            </div>

            <EventTalentBoundary eventId={eventId} canManage={canManageEvent} />

            {canManageEvent && savedCreative && savedCreative.length > 0 && (
              <div className="order-5 mt-5 rounded-[1.5rem] border border-zinc-200 bg-white p-5 sm:mt-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-violet-700">
                      Launch Creative
                    </p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-[-0.04em] sm:tracking-tight">
                      Saved Flyers & Captions
                    </h2>

                    <p className="mt-2 text-sm text-zinc-600">
                      {savedCreative.length} saved creative asset
                      {savedCreative.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-1 sm:grid-cols-2">
                  {savedCreative.slice(0, 4).map((creative) => (
                    <div
                      key={creative._id}
                      className="group relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-zinc-950"
                    >
                      <div className="pointer-events-none absolute right-[-30px] top-[-30px] h-28 w-28 rounded-full bg-violet-500/10 blur-3xl transition group-hover:bg-orange-500/10" />

                      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-black text-white">
                          {creative.title || "Event Flyer"}
                        </h3>

                        <span className="rounded-full border border-violet-300/20 bg-gradient-to-r from-violet-500/20 to-orange-500/20 px-3 py-1 text-[11px] sm:text-xs font-black text-violet-800 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                          {creative.style || "Luxury"}
                        </span>
                      </div>

                      {creative.imageUrl && (
                        <img
                          src={brandedMediaUrl(creative.imageUrl) ?? creative.imageUrl}
                          alt={creative.title || "Saved creative"}
                          className="mt-4 h-40 w-full rounded-2xl object-cover"
                        />
                      )}

                      <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                        {creative.createdAt
                          ? new Date(creative.createdAt).toLocaleDateString()
                          : "Recently created"}
                      </p>

                      {creative.prompt && (
                        <p className="mt-3 line-clamp-2 text-sm text-zinc-600">
                          {creative.prompt}
                        </p>
                      )}

                      {creative.caption && (
                        <>
                          <pre className="mt-4 max-h-32 overflow-auto whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-zinc-100 p-4 text-[11px] sm:text-xs leading-relaxed text-zinc-600">
                            {creative.caption}
                          </pre>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => copyText(creative.caption)}
                              className="rounded-full border border-zinc-200 bg-zinc-100 px-4 min-h-11 py-3.5 sm:py-3 sm:py-2 text-[11px] sm:text-xs font-black text-zinc-900 hover:bg-zinc-200"
                            >
                              Copy Caption
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(canManageEvent || merchItems.length > 0) && (
              <div className="order-4 mt-5 sm:mt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] text-orange-800">
                      Event Commerce
                    </p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-[-0.04em] sm:tracking-tight">
                      Merch Drops
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
                      Limited event merchandise, preorder items, and organizer
                      drops.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {merchItems.length > 0 && (
                      <Link
                        href={`/events/${event._id}/merch`}
                        className="rounded-2xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 min-h-11 py-3.5 sm:py-3 text-sm font-black text-white"
                      >
                        Shop Merch →
                      </Link>
                    )}
                    {canManageEvent && (
                      <Link
                        href={`/events/${event._id}/add-merch`}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white bg-white px-5 py-3.5 text-sm font-black text-zinc-950 shadow-sm transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:py-3"
                      >
                        Add Merch →
                      </Link>
                    )}
                  </div>
                </div>

                {canManageEvent && merch?.settings && <EventMerchSettings eventId={eventId} settings={merch.settings} />}
                {merch === undefined ? (
                  <div className="mt-4 max-w-full rounded-[1.5rem] sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 text-zinc-600">
                    Loading merch...
                  </div>
                 ) : merchItems.length === 0 ? (
                  <div className="mt-4 max-w-full rounded-[1.5rem] sm:rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 text-zinc-600">
                    No merch added yet.
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
                    {merchItems.map((item) => {
                      const available = item.variants.length
                        ? Math.max(...item.variants.map((variant) => variant.available))
                        : item.available;
                      return (
                      <div
                        key={item._id}
                        className="group min-w-0 overflow-hidden bg-white"
                      >
                        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
                          <MerchImage
                            imageUrl={item.imageUrl}
                            storageId={item.imageStorageId}
                            name={item.name}
                          />
                        </div>

                        <div className="px-0 py-3">
                          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-950">{item.name}</h3>

                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                              {item.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                            <p className="text-sm font-semibold">${item.price}</p>
                            <p className="text-xs text-zinc-500">
                              {available > 0 ? `${available} left` : "Sold out"}
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {available > 0 ? (
                              <Link
                                href={`/events/${event._id}/merch?product=${encodeURIComponent(item._id)}`}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                              >
                                Buy this item
                              </Link>
                            ) : (
                              <span className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-600">
                                Sold out
                              </span>
                            )}
                            {canManageEvent && (
                              <Link
                                href={`/host/events/${event._id}/merch/${item._id}/edit`}
                                className="inline-flex min-h-10 items-center rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
                              >
                                Edit Merch
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="order-2 relative h-fit overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-[0_25px_70px_rgba(40,26,66,0.12)] before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-violet-700 lg:sticky lg:top-6 sm:p-8" style={{ color: "#18181b" }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
              Your way in
            </p>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-600">Tickets from</p>
                <p className="mt-1 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                  {startingPrice === null ? "—" : getFromPriceLabel({ startingPrice })}
                </p>
                {startingPrice !== null && startingPrice > 0 && (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Price includes the Function Hour service fee
                  </p>
                )}
              </div>
              {event.totalTickets ? (
                <p className="pb-1 text-right text-xs font-semibold text-zinc-500">
                  {Math.max(event.totalTickets - (event.ticketsSold ?? 0), 0)}{" "}
                  remaining
                </p>
              ) : null}
            </div>

            {activeTicketTypes.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-zinc-200 pt-5">
                {activeTicketTypes.map((ticket) => {
                  const soldOut =
                    ticket.isSoldOut ||
                    Boolean(
                      ticket.quantity !== undefined && (ticket.sold ?? 0) >= ticket.quantity,
                    );

                  return (
                    <div
                      key={ticket._id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {ticket.name}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${soldOut ? "text-red-700" : "text-zinc-500"}`}
                        >
                          {soldOut ? "Sold out" : ticket.salesPaused ? "Sales paused" : "Available"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black">
                        {getBuyerPriceLabel({ startingPrice: ticket.price })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {ticketAddOns &&
              ticketAddOns.some((addOn) => addOn.isActive !== false) && (
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Optional upgrades are available during checkout.
                </p>
              )}

            <div className="mt-5 border-t border-zinc-200 pt-4 text-sm leading-6 text-zinc-600">
              <span className="font-black">Refund terms: </span>{event.refundPolicy || "All sales are final unless otherwise stated by the event host."}
              {event.refundDeadline && <span className="block text-zinc-600">Deadline: {event.refundDeadline}</span>}
            </div>
            <div className="mt-5">
              {event.isDemo ? (
                <div className="w-full rounded-xl border-2 border-violet-400 bg-white px-5 py-4 text-center text-sm leading-6 text-black shadow-sm dark:border-violet-300/50 dark:bg-zinc-900 dark:text-white">
                  <strong className="block text-base font-black text-violet-950 dark:text-violet-200">Demo Event</strong>
                  <p className="mt-1 font-semibold text-black dark:text-white">This is a sample event created to demonstrate the FunctionHour experience. No real event or ticket purchase is associated with this listing.</p>
                </div>
              ) : !salesOpen ? (
                <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-center font-bold text-zinc-800">
                  {salesState === "cancelled" ? "Event cancelled — ticket sales closed" : salesState === "postponed" ? "Event postponed — ticket sales paused" : salesState === "sold_out" ? "Sold out" : salesState === "deadline" ? "Ticket sales have closed" : salesState === "unavailable" ? "Tickets currently unavailable" : salesState === "loading" ? "Checking ticket availability…" : "Ticket sales ended"}
                  {salesState === "sold_out" && <Link href="/events" className="mt-2 block text-sm text-violet-700 underline">Explore other events</Link>}
                </div>
              ) : !isLoaded ? (
                <button
                  disabled
                  className="w-full rounded-xl bg-white px-5 py-4 font-black text-black opacity-50"
                >
                  Loading…
                </button>
              ) : !isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="w-full rounded-xl bg-violet-700 px-5 py-4 font-black text-white transition hover:bg-violet-800">
                    Sign in to get tickets
                  </button>
                </SignInButton>
              ) : alreadyPurchased ? (
                <Link
                  href="/my-tickets"
                  className="block w-full rounded-xl bg-emerald-400 px-5 py-4 text-center font-black text-black"
                >
                  View your ticket
                </Link>
              ) : (
                <Link
                  href={`/events/${event._id}/checkout`}
                  className="block w-full rounded-xl bg-violet-700 px-5 py-4 text-center font-black text-white transition hover:bg-violet-800"
                >
                  Get tickets
                </Link>
              )}
            </div>

            {!event.isDemo && (
              <p className="mt-4 text-center text-xs text-zinc-600">
                Secure checkout · Tickets appear in My Tickets
              </p>
            )}

            <div className="mt-5 border-t border-zinc-200 pt-5">
              <ShareEventButton
                eventId={event._id}
                title={event.name}
                location={attendeeVenue(event)}
                date={formatEventDate(event)}
              />
            </div>
          </aside>
        </div>

        <details className="mt-5 rounded-[1.5rem] border border-zinc-200 bg-white p-5 open:bg-white sm:mt-6 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black">
            <span>Refunds and purchase terms</span>
            <span className="text-sm font-semibold text-zinc-500">
              View details
            </span>
          </summary>
          <div className="mt-5 border-t border-zinc-200 pt-5">
            <p className="leading-7 text-zinc-600">
              {event.refundPolicy ||
                "All sales are final unless otherwise stated by the event host."}
            </p>

            {event.refundDeadline && (
              <p className="mt-4 text-sm text-zinc-500">
                Refund deadline:{" "}
                <span className="font-semibold text-zinc-900">
                  {event.refundDeadline}
                </span>
              </p>
            )}

            {event.refundContactEmail && (
              <a
                href={`mailto:${event.refundContactEmail}`}
                className="mt-3 inline-block text-sm font-semibold text-orange-800 hover:text-orange-900"
              >
                Contact {event.refundContactEmail}
              </a>
            )}
          </div>
        </details>

        <EventLocationPreview
          location={event.location}
          venueName={event.venueName}
          city={event.city}
          state={event.state}
        />
      </section>
      <div className="h-28 sm:hidden" />

      {/* Mobile Sticky Purchase Bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
              Tickets
            </p>

            <div>
              <p className="truncate text-lg font-black text-white">
                {startingPrice === null ? "—" : getFromPriceLabel({ startingPrice })}
              </p>
              {startingPrice !== null && startingPrice > 0 && (
                <p className="text-[9px] text-white/65">Includes service fee</p>
              )}
            </div>
          </div>

          {event.isDemo ? (
            <span className="max-w-[60%] rounded-xl border border-violet-300/50 bg-violet-50 px-4 py-3 text-center text-xs font-bold text-violet-950 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-100">Demo Event · Sample listing</span>
          ) : !salesOpen ? (
            <span className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-black text-zinc-400">
              {salesState === "cancelled" ? "Event Cancelled" : salesState === "postponed" ? "Event Postponed" : salesState === "sold_out" ? "Sold Out" : salesState === "deadline" ? "Sales Closed" : salesState === "unavailable" ? "Unavailable" : salesState === "loading" ? "Checking…" : "Sales Ended"}
            </span>
          ) : !isLoaded ? (
            <button
              type="button"
              disabled
              className="shrink-0 rounded-2xl bg-white px-6 py-4 font-black text-black opacity-50"
            >
              Loading...
            </button>
          ) : !isSignedIn ? (
            <SignInButton mode="modal">
              <button
                type="button"
                className="shrink-0 rounded-2xl bg-gradient-to-r from-violet-500 to-orange-500 px-6 py-4 font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.3)]"
              >
                Sign In
              </button>
            </SignInButton>
          ) : alreadyPurchased ? (
            <Link
              href="/my-tickets"
              className="shrink-0 rounded-2xl bg-green-500 px-6 py-4 font-black text-black shadow-[0_0_25px_rgba(34,197,94,0.2)]"
            >
              View Ticket
            </Link>
          ) : (
            <Link
              href={`/events/${event._id}/checkout`}
              className="shrink-0 rounded-2xl bg-gradient-to-r from-violet-500 to-orange-500 px-6 py-4 font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] transition active:scale-[0.98]"
            >
              Get Tickets →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function EventSignalCard({ icon, label, value }: { icon: "date" | "place"; label: string; value: string }) {
  const Icon = icon === "date" ? CalendarDays : MapPin;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-zinc-900">{value}</p>
      </div>
    </div>
  );
}
