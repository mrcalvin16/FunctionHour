"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEventCommandCenter } from "@/components/host/events/command-center/EventCommandCenter";

const categories = [
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
  const [price, setPrice] = useState("");
  const [totalTickets, setTotalTickets] = useState("");

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

  useEffect(() => {
    if (!event) return;

    setName(event.name ?? "");
    setDescription(event.description ?? "");
    setCategory(event.category ?? "Party");

    setVenueName(event.venueName ?? "");
    setVenueAddress(event.venueAddress ?? "");
    setCity(event.city ?? "");
    setStateValue(event.state ?? "");

    setDateString(event.dateString ?? "");
    setPrice(String(event.price ?? 0));
    setTotalTickets(String(event.totalTickets ?? 0));

    setRefundPolicy(
      event.refundPolicy ||
        "All sales are final unless otherwise stated by the event host."
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
          fullLocation
        )}.json?access_token=${token}&limit=1`
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
    if (!name.trim()) return "Event name is required.";
    if (!description.trim()) return "Event description is required.";
    if (!venueName.trim()) return "Venue name is required.";
    if (!venueAddress.trim()) return "Venue address is required.";
    if (!city.trim()) return "City is required.";
    if (!stateValue.trim()) return "State is required.";
    if (!dateString.trim()) return "Event date is required.";

    const numericPrice = Number(price);
    const numericTickets = Number(totalTickets);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return "Ticket price must be 0 or greater.";
    }

    if (
      Number.isNaN(numericTickets) ||
      numericTickets < 1 ||
      !Number.isInteger(numericTickets)
    ) {
      return "Total tickets must be a whole number greater than 0.";
    }

    if (!refundPolicy.trim()) {
      return "Refund policy is required.";
    }

    if (
      refundContactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refundContactEmail.trim())
    ) {
      return "Refund contact email must be valid.";
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
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const location = [venueName, venueAddress, city, stateValue]
        .filter(Boolean)
        .join(", ");

      const { latitude, longitude } = await geocodeAddress(location);

      await updateEvent({
        eventId: event._id,
        name: name.trim(),
        description: description.trim(),
        category,
        location,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        city: city.trim(),
        state: stateValue.trim(),
        latitude,
        longitude,
        dateString,
        eventDate: new Date(dateString).getTime(),
        price: Number(price),
        totalTickets: Number(totalTickets),
        refundPolicy: refundPolicy.trim(),
        refundDeadline: refundDeadline.trim(),
        refundContactEmail: refundContactEmail.trim(),

        dressCode: dressCode.trim(),
        ageRequirement: ageRequirement.trim(),
        parkingInfo: parkingInfo.trim(),
        entryNotes: entryNotes.trim(),
      });

      setStatusMessage("Event updated successfully.");
    } catch (err) {
      console.error("Error updating event:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong updating the event."
      );
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
      setDeleteError(err instanceof Error ? err.message : "Unable to delete this event.");
      setIsDeleting(false);
    }
  }

  const canManageEvent =
    capabilities.includes("manage_event");

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
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
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
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Street Address
              </label>
              <input
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-white/70">
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-white/70">
                  State
                </label>
                <input
                  value={stateValue}
                  onChange={(e) => setStateValue(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-white/70">
                Event Date
              </label>
              <input
                type="datetime-local"
                value={dateString}
                onChange={(e) => setDateString(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Fallback ticket price
              </label>
              <p className="mt-1 text-xs text-white/45">Used when this event has no ticket types. Edit ticket type prices in <Link className="text-orange-300 underline" href={`/host/events/${event._id}/tickets`}>Tickets</Link>.</p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Total Tickets
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              />
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-orange-500/20 bg-orange-500/5 p-5">
            <h2 className="text-2xl font-black">Refund Policy</h2>

            <div>
              <label className="text-sm font-semibold text-white/70">
                Refund Terms
              </label>
              <textarea
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
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-2xl bg-white px-6 py-4 font-black text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">Danger Zone</p>
            <h2 className="mt-2 text-2xl font-black">Delete event permanently</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Only events with no ticket, merchandise, or promotion history can be deleted. This removes the event and its draft configuration permanently.
            </p>

            {deletionImpact === undefined ? (
              <p className="mt-5 text-sm text-white/50">Checking event history…</p>
            ) : deletionImpact?.canDelete ? (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-semibold text-white/70">
                  Type <span className="text-white">{event.name}</span> to confirm
                </label>
                <input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full rounded-2xl border border-red-500/30 bg-black px-5 py-4 text-white outline-none focus:border-red-400"
                />
                {deleteError ? <p className="text-sm text-red-300">{deleteError}</p> : null}
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={isDeleting || deleteConfirmation.trim() !== event.name.trim()}
                  className="rounded-2xl bg-red-600 px-6 py-3 font-black text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDeleting ? "Deleting…" : "Delete Event"}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/65">
                Permanent deletion is locked because this event has protected history: {deletionImpact?.tickets ?? 0} tickets, {deletionImpact?.ticketOrders ?? 0} ticket orders, {deletionImpact?.merchOrders ?? 0} merch orders, and {deletionImpact?.boostOrders ?? 0} promotions.
              </div>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
}
