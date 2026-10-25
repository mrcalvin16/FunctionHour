"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { attendeeEventDate } from "@/lib/attendeeDisplay";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEventCommandCenter } from "@/components/host/events/command-center/EventCommandCenter";

const categories = [
  "Experience",
  "Party",
  "Music",
  "Nightlife",
  "Festival",
  "Food",
  "Networking",
  "Concert",
  "Reunion",
  "Conference",
  "Religious",
  "Sports",
];

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default function EditEventPage() {
  const router = useRouter();
  const { event, capabilities, role } = useEventCommandCenter();
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const deletionImpact = useQuery(api.events.getEventDeletionImpact, {
    eventId: event._id,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Party");

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");

  const [dateString, setDateString] = useState("");
  const [endDateString, setEndDateString] = useState("");
  const [price, setPrice] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState("10");

  const [refundPolicy, setRefundPolicy] = useState("");
  const [refundDeadline, setRefundDeadline] = useState("");
  const [refundContactEmail, setRefundContactEmail] = useState("");

  const [dressCode, setDressCode] = useState("");
  const [ageRequirement, setAgeRequirement] = useState("21+");
  const [parkingInfo, setParkingInfo] = useState("");
  const [entryNotes, setEntryNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const initializedEventId = useRef<string | null>(null);
  // Only a deliberate organizer edit may trigger a protected event change.
  // Legacy records may store venue/address and datetime strings differently
  // from the browser form, so comparing hydrated values alone is unreliable.
  const protectedEdits = useRef(new Set<string>());
  const markProtectedEdit = (field: string) => protectedEdits.current.add(field);

  useEffect(() => {
    if (!event || initializedEventId.current === event._id) return;
    initializedEventId.current = event._id;
    protectedEdits.current.clear();

    setName(event.name ?? "");
    setDescription(event.description ?? "");
    setCategory(event.category ?? "Party");

    setVenueName(event.venueName ?? "");
    setVenueAddress(event.venueAddress ?? "");
    setCity(event.city ?? "");
    setStateValue((event.state ?? "").trim().toUpperCase());

    setDateString(event.dateString ?? "");
    setEndDateString(event.endDateString ?? "");
    setPrice(String(event.price ?? 0));
    setTotalTickets(String(event.totalTickets ?? 0));
    setMaxTicketsPerOrder(String(event.maxTicketsPerOrder ?? 10));

    setRefundPolicy(
      event.refundPolicy ||
        "All sales are final unless otherwise stated by the event host.",
    );
    setRefundDeadline(event.refundDeadline ?? "");
    setRefundContactEmail(event.refundContactEmail ?? "");

    setDressCode(event.dressCode ?? "");
    setAgeRequirement(event.ageRequirement ?? "21+");
    setParkingInfo(event.parkingInfo ?? "");
    setEntryNotes(event.entryNotes ?? "");
  }, [event]);

  async function geocodeAddress(fullLocation: string) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token || !fullLocation.trim()) {
      return {
        latitude: event?.latitude,
        longitude: event?.longitude,
      };
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          fullLocation,
        )}.json?access_token=${token}&limit=1`,
      );

      if (!response.ok) {
        return {
          latitude: event?.latitude,
          longitude: event?.longitude,
        };
      }

      const data = await response.json();
      const first = data?.features?.[0];

      if (!first?.center) {
        return {
          latitude: event?.latitude,
          longitude: event?.longitude,
        };
      }

      const [longitude, latitude] = first.center;

      return { latitude, longitude };
    } catch {
      return {
        latitude: event?.latitude,
        longitude: event?.longitude,
      };
    }
  }

  function validateForm() {
    if (!name.trim())
      return { message: "Event name is required.", fieldId: "event-name" };
    if (!description.trim())
      return {
        message: "Event description is required.",
        fieldId: "event-description",
      };
    if (!venueName.trim())
      return { message: "Venue name is required.", fieldId: "venue-name" };
    if (!venueAddress.trim())
      return {
        message: "Venue address is required.",
        fieldId: "venue-address",
      };
    if (!city.trim())
      return { message: "City is required.", fieldId: "event-city" };
    if (!stateValue.trim())
      return { message: "State is required.", fieldId: "event-state" };
    if (!dateString.trim() || Number.isNaN(new Date(dateString).getTime())) {
      return {
        message: "Enter a valid event date and time.",
        fieldId: "event-date",
      };
    }

    if (endDateString.trim()) {
      const end = new Date(endDateString).getTime();
      if (!Number.isFinite(end) || end <= new Date(dateString).getTime()) {
        return { message: "End date and time must be after the event starts.", fieldId: "event-end-date" };
      }
    }

    const orderLimit = Number(maxTicketsPerOrder);
    if (!Number.isInteger(orderLimit) || orderLimit < 1 || orderLimit > 10) {
      return { message: "Choose a purchase limit from 1 to 10.", fieldId: "max-tickets-per-order" };
    }

    const numericPrice = Number(price);
    const numericTickets = Number(totalTickets);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return {
        message: "Ticket price must be 0 or greater.",
        fieldId: "event-price",
      };
    }

    if (
      Number.isNaN(numericTickets) ||
      numericTickets < 1 ||
      !Number.isInteger(numericTickets)
    ) {
      return {
        message: "Total tickets must be a whole number greater than 0.",
        fieldId: "total-tickets",
      };
    }

    if (!refundPolicy.trim()) {
      return {
        message: "Refund policy is required.",
        fieldId: "refund-policy",
      };
    }

    if (
      refundContactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refundContactEmail.trim())
    ) {
      return {
        message: "Refund contact email must be valid.",
        fieldId: "refund-contact-email",
      };
    }

    return "";
  }

  async function handleUpdateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!event) return;

    setError("");
    setStatusMessage("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError.message);
      requestAnimationFrame(() => {
        const field = document.getElementById(validationError.fieldId);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        field?.focus({ preventScroll: true });
      });
      return;
    }

    setIsSaving(true);

    try {
      // Standard Save is deliberately limited to ordinary settings. Schedule
      // and venue changes always require the attendee-notification workflow.
      // Do not infer protected edits from hydrated legacy event fields.
      await updateEvent({
        eventId: event._id,
        name: name.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        totalTickets: Number(totalTickets),
        maxTicketsPerOrder: Number(maxTicketsPerOrder),
        refundPolicy: refundPolicy.trim(),
        refundDeadline: refundDeadline.trim(),
        refundContactEmail: refundContactEmail.trim(),

        dressCode: dressCode.trim(),
        ageRequirement: ageRequirement.trim(),
        parkingInfo: parkingInfo.trim(),
        entryNotes: entryNotes.trim(),
      });

      setStatusMessage("Event details and ticket settings saved. The event schedule was not changed; use Event changes for dates and times.");
      router.refresh();
    } catch (err) {
      console.error("Error updating event:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong updating the event.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveOtherSettings() {
    if (!event || isSaving) return;
    setError("");
    setStatusMessage("");

    // This action deliberately excludes date, time, address, location and
    // coordinates. Organizers must use Event changes for those fields.
    const numericPrice = Number(price);
    const numericTickets = Number(totalTickets);
    const orderLimit = Number(maxTicketsPerOrder);
    if (!name.trim() || !description.trim() || !refundPolicy.trim() ||
        !Number.isFinite(numericPrice) || numericPrice < 0 ||
        !Number.isInteger(numericTickets) || numericTickets < 1 ||
        !Number.isInteger(orderLimit) || orderLimit < 1 || orderLimit > 10 ||
        (refundContactEmail.trim() && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(refundContactEmail.trim()))) {
      setError("Check the event name, description, price, capacity, purchase limit and refund settings before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await updateEvent({
        eventId: event._id,
        name: name.trim(),
        description: description.trim(),
        category,
        price: numericPrice,
        totalTickets: numericTickets,
        maxTicketsPerOrder: orderLimit,
        refundPolicy: refundPolicy.trim(),
        refundDeadline: refundDeadline.trim(),
        refundContactEmail: refundContactEmail.trim(),
        dressCode: dressCode.trim(),
        ageRequirement: ageRequirement.trim(),
        parkingInfo: parkingInfo.trim(),
        entryNotes: entryNotes.trim(),
      });
      // Reset only the unsaved protected fields, making the form consistent
      // with the event record rather than implying those edits were saved.
      setVenueName(event.venueName ?? "");
      setVenueAddress(event.venueAddress ?? "");
      setCity(event.city ?? "");
      setStateValue((event.state ?? "").trim().toUpperCase());
      setDateString(event.dateString ?? "");
      setEndDateString(event.endDateString ?? "");
      protectedEdits.current.clear();
      setStatusMessage("Other settings saved. Date, time and venue changes were NOT saved. Use Event changes to update attendees.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save other settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEvent() {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await deleteEvent({
        eventId: event._id,
        confirmationName: deleteConfirmation,
      });
      router.replace("/host/events");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete this event.",
      );
      setIsDeleting(false);
    }
  }

  const canManageEvent = capabilities.includes("manage_event");

  if (!canManageEvent) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <h1 className="text-3xl font-black">You can’t edit this event</h1>
        <p className="max-w-md text-white/60">
          Your event role does not include event-management access.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
            Event configuration
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Settings
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Update event details, venue information, ticket settings, and refund
            terms.
          </p>
        </div>

        <form
          onSubmit={handleUpdateEvent}
          className="space-y-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:p-8"
        >
          {error && (
            <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>{error}</p>
              {error.includes("ticket holders") && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveOtherSettings}
                    className="rounded-xl bg-white px-4 py-2 font-semibold text-zinc-950 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save other settings only"}
                  </button>
                  <Link
                    href={`/host/events/${event._id}/changes`}
                    className="font-semibold text-white underline underline-offset-4"
                  >
                    Open Event changes
                  </Link>
                  <p className="w-full text-xs text-red-100">
                    Saving other settings will not save changes to the event date, time or venue. Those fields will be reset to their current values.
                  </p>
                </div>
              )}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
              {statusMessage}
            </div>
          )}

          <section className="space-y-5">
            <h2 className="text-2xl font-black">Event Details</h2>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Event Title
              </label>
              <input
                id="event-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Description
              </label>
              <textarea
                id="event-description"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 min-h-36 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-white/10 bg-black/40 p-5">
            <h2 className="text-2xl font-black">Venue Location</h2>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Venue Name
              </label>
              <input
                id="venue-name"
                required
                value={venueName}
                onChange={(e) => { markProtectedEdit("venueName"); setVenueName(e.target.value) }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Street Address
              </label>
              <input
                id="venue-address"
                required
                value={venueAddress}
                onChange={(e) => { markProtectedEdit("venueAddress"); setVenueAddress(e.target.value) }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-white/70">
                  City
                </label>
                <input
                  id="event-city"
                  required
                  value={city}
                  onChange={(e) => { markProtectedEdit("city"); setCity(e.target.value) }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/70">
                  State
                </label>
                <input
                  id="event-state"
                  required
                  list="event-state-options"
                  maxLength={2}
                  placeholder="LA"
                  value={stateValue}
                  onChange={(e) => { markProtectedEdit("state"); setStateValue(e.target.value.toUpperCase()) }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                />
                <datalist id="event-state-options">
                  {usStates.map((state) => <option key={state} value={state} />)}
                </datalist>
                <p className="mt-2 text-xs text-white/50">Use the two-letter state abbreviation (e.g., LA).</p>
              </div>
            </div>
          </section>

          <section className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6">
            <div>
              <h2 className="text-2xl font-black">Schedule &amp; tickets</h2>
              <p className="mt-1 text-sm text-white/55">View the current schedule and update ticket capacity or purchase limits here. Use Event changes to reschedule an event.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white/80">Event schedule</p>
              <p className="mt-2 text-lg font-bold text-white">{attendeeEventDate(event)}</p>
              <p className="mt-2 text-xs text-white/60">
                Includes the end time when one is set. Ticket holders see this schedule on the event page and their tickets.
              </p>
              <Link
                href={`/host/events/${event._id}/changes`}
                className="mt-4 inline-flex rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-black hover:bg-orange-400"
              >
                Edit start / end date &amp; time
              </Link>
              <p className="mt-3 text-xs text-white/55">
                Schedule updates for ticketed events are recorded in Event changes so attendees can be notified.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label htmlFor="event-price" className="text-sm font-semibold text-white/80">Default ticket price</label>
                <input id="event-price" required type="number" min="0" step="0.01" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40" />
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  Only used if no ticket types are set. Manage ticket prices in{" "}
                  <Link className="font-semibold text-orange-300 underline" href={`/host/events/${event._id}/tickets`}>Tickets</Link>.
                </p>
              </div>
              <div>
                <label htmlFor="total-tickets" className="text-sm font-semibold text-white/80">Event capacity</label>
                <input id="total-tickets" required type="number" min="1" step="1" value={totalTickets}
                  onChange={(e) => setTotalTickets(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40" />
                <p className="mt-2 text-xs text-white/50">Total number of available tickets.</p>
              </div>
              <div>
                <label htmlFor="max-tickets-per-order" className="text-sm font-semibold text-white/80">Tickets per order</label>
                <input id="max-tickets-per-order" required type="number" min="1" max="10" step="1"
                  value={maxTicketsPerOrder} onChange={(e) => setMaxTicketsPerOrder(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40" />
                <p className="mt-2 text-xs text-white/50">Maximum 10 tickets in one purchase.</p>
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5">
            <h2 className="text-2xl font-black">Refund Policy</h2>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Refund Terms
              </label>
              <textarea
                id="refund-policy"
                required
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-orange-400/50"
                placeholder="Example: Refunds are available up to 7 days before the event. Processing fees are non-refundable."
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-white/70">
                  Refund Deadline
                </label>
                <input
                  value={refundDeadline}
                  onChange={(e) => setRefundDeadline(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-orange-400/50"
                  placeholder="Example: 7 days before event"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/70">
                  Refund Contact Email
                </label>
                <input
                  id="refund-contact-email"
                  type="email"
                  value={refundContactEmail}
                  onChange={(e) => setRefundContactEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-orange-400/50"
                  placeholder="refunds@example.com"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
            <div className="sm:hidden">
              {error && (
                <p
                  className="mb-3 text-sm font-semibold text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {statusMessage && (
                <p
                  className="mb-3 text-sm font-semibold text-emerald-300"
                  role="status"
                >
                  {statusMessage}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-4 font-black text-white shadow-lg shadow-violet-950/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </button>

            <Link
              href={`/host/events/${event._id}`}
              className="rounded-2xl border border-white/10 px-6 py-4 text-center font-bold text-white hover:bg-white/10"
            >
              Back to overview
            </Link>
          </div>
        </form>

        {role === "owner" ? (
          <section className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/5 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
              Danger Zone
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Delete event permanently
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Only events with no ticket, merchandise, or promotion history can
              be deleted. This removes the event and its draft configuration
              permanently.
            </p>

            {deletionImpact === undefined ? (
              <p className="mt-5 text-sm text-white/50">
                Checking event history…
              </p>
            ) : deletionImpact?.canDelete ? (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-semibold text-white/70">
                  Type <span className="text-white">{event.name}</span> to
                  confirm
                </label>
                <input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full rounded-2xl border border-red-500/30 bg-black px-5 py-4 text-white outline-none focus:border-red-400"
                />
                {deleteError ? (
                  <p className="text-sm text-red-300">{deleteError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={
                    isDeleting ||
                    deleteConfirmation.trim() !== event.name.trim()
                  }
                  className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDeleting ? "Deleting…" : "Delete Event"}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/65">
                Permanent deletion is locked because this event has protected
                history: {deletionImpact?.tickets ?? 0} tickets,{" "}
                {deletionImpact?.ticketOrders ?? 0} ticket orders,{" "}
                {deletionImpact?.merchOrders ?? 0} merch orders, and{" "}
                {deletionImpact?.boostOrders ?? 0} promotions.
              </div>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
}
