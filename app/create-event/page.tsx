"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import OrganizerAccessGate from "@/components/OrganizerAccessGate";

function CreateEventPageContent() {
  const router = useRouter();
  const {isLoaded, isSignedIn, userId, getToken} = useAuth();

  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const createEvent = useMutation(api.events.createEvent);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Party");

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");

  const [eventDate, setEventDate] = useState("");
  const [price, setPrice] = useState("");
  const [totalTickets, setTotalTickets] = useState("");

  const [dressCode, setDressCode] = useState("");
  const [ageRequirement, setAgeRequirement] = useState("21+");
  const [parkingInfo, setParkingInfo] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");

  const [image, setImage] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const draftKey = userId ? `functionhour:event-draft:${userId}` : null;
  const checklist = useMemo(() => [
    { label: "Event name and description", ready: Boolean(name.trim() && description.trim()) },
    { label: "Venue, address, and city", ready: Boolean(venueName.trim() && venueAddress.trim() && city.trim() && stateValue.trim()) },
    { label: "Future date and time", ready: Boolean(eventDate && new Date(eventDate).getTime() > Date.now()) },
    { label: "Ticket price and capacity", ready: price !== "" && Number(price) >= 0 && Number.isInteger(Number(totalTickets)) && Number(totalTickets) > 0 },
    { label: "Refund terms", ready: Boolean(refundPolicy.trim()) },
    { label: "Event image (recommended)", ready: Boolean(image), optional: true },
  ], [name, description, venueName, venueAddress, city, stateValue, eventDate, price, totalTickets, refundPolicy, image]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, string>;
      setName(draft.name || ""); setDescription(draft.description || ""); setCategory(draft.category || "Party");
      setVenueName(draft.venueName || ""); setVenueAddress(draft.venueAddress || "");
      setCity(draft.city || ""); setStateValue(draft.stateValue || ""); setEventDate(draft.eventDate || "");
      setPrice(draft.price || ""); setTotalTickets(draft.totalTickets || "");
      setDressCode(draft.dressCode || ""); setAgeRequirement(draft.ageRequirement || "21+");
      setParkingInfo(draft.parkingInfo || ""); setEntryNotes(draft.entryNotes || "");
      setRefundPolicy(draft.refundPolicy || "");
      setDraftNotice("Your draft was restored on this device. Reattach the event image before publishing.");
    } catch { setDraftNotice("A saved draft could not be restored."); }
  }, [draftKey]);

  function saveDraft() {
    if (!draftKey) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ name, description, category, venueName,
        venueAddress, city, stateValue, eventDate, price, totalTickets, dressCode, ageRequirement,
        parkingInfo, entryNotes, refundPolicy }));
      setDraftNotice("Draft saved on this device. Event images are not saved with local drafts.");
    } catch { setDraftNotice("Unable to save a draft on this device."); }
  }

  async function geocodeAddress(fullLocation: string) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token || !fullLocation.trim()) {
      return { latitude: undefined, longitude: undefined };
    }

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          fullLocation
        )}.json?access_token=${token}&limit=1`
      );

      if (!res.ok) {
        return { latitude: undefined, longitude: undefined };
      }

      const data = await res.json();
      const first = data?.features?.[0];

      if (!first?.center) {
        return { latitude: undefined, longitude: undefined };
      }

      const [longitude, latitude] = first.center;

      return { latitude, longitude };
    } catch {
      return { latitude: undefined, longitude: undefined };
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!isLoaded) {
      setError("Auth is still loading. Try again in a second.");
      return;
    }

    if (!isSignedIn) {
      setError("Please sign in before creating an event.");
      return;
    }

    const convexToken = await getToken({ template: "convex" });

    if (!convexToken) {
      setError("Your secure session is still loading. Please refresh and try again.");
      return;
    }

    if (
      !name ||
      !description ||
      !venueName ||
      !venueAddress ||
      !city ||
      !stateValue ||
      !eventDate ||
      price === "" ||
      !totalTickets
    ) {
      setError("Please fill out all required fields.");
      return;
    }

    if (checklist.some((item) => !item.ready && !item.optional)) {
      setError("Complete the required publishing details, including refund terms, before publishing.");
      return;
    }

    try {
      setIsSubmitting(true);

      let imageStorageId: Id<"_storage"> | undefined = undefined;

      if (image) {
        const uploadUrl = await generateUploadUrl();

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": image.type,
          },
          body: image,
        });

        if (!uploadResult.ok) {
          throw new Error("Image upload failed.");
        }

        const { storageId } = await uploadResult.json();
        imageStorageId = storageId;
      }

      const location = [venueName, venueAddress, city, stateValue]
        .filter(Boolean)
        .join(", ");

      const { latitude, longitude } = await geocodeAddress(location);

      const eventId = await createEvent({
        name,
        description,
        category,
        location,
        venueName,
        venueAddress,
        city,
        state: stateValue,
        latitude,
        longitude,
        eventDate: new Date(eventDate).getTime(),
        dateString: eventDate,
        price: Number(price),
        totalTickets: Number(totalTickets),

        dressCode,
        ageRequirement,
        parkingInfo,
        entryNotes,
        refundPolicy,

        imageStorageId,
      });

      if (draftKey) window.localStorage.removeItem(draftKey);
      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">
            Function Hour Organizer
          </p>
          <h1 className="mt-3 text-4xl font-black">Create Event</h1>
          <p className="mt-2 text-white/60">
            Add your event details, venue, ticket price, and image.
          </p>
        </div>

        {!isLoaded ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            Loading account...
          </div>
        ) : !isSignedIn ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            You must be signed in to create an event.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
          >
            <div className="rounded-2xl border border-violet-300/30 bg-violet-950/30 p-5">
              <h2 className="text-lg font-black text-white">Before you publish</h2>
              <p className="mt-1 text-sm text-zinc-200">Save a draft anytime. Visitors will see this event as soon as you publish it.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {checklist.map((item) => <li key={item.label} className={`text-sm font-semibold ${item.ready ? "text-emerald-200" : "text-zinc-200"}`}>
                  <span aria-hidden="true">{item.ready ? "✓" : "○"}</span> {item.label}
                </li>)}
              </ul>
              {draftNotice && <p role="status" className="mt-3 text-sm text-white">{draftNotice}</p>}
              <button type="button" onClick={saveDraft} className="mt-4 rounded-xl border border-white/50 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">Save draft on this device</button>
            </div>
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              placeholder="Event name"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <input
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                  placeholder="Venue name"
                />

                <input
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                  placeholder="Street address"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                    placeholder="City"
                  />

                  <input
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>

            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-white/40"
                placeholder="Total tickets"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-violet-300/70">
                  Venue Rules
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Guest Experience
                </h2>
              </div>

              <div className="space-y-4">
                <input
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />

                <select
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>

                <textarea
                  value={parkingInfo}
                  onChange={(e) => setParkingInfo(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-violet-400/40"
                  placeholder="Parking instructions, valet, nearby lots..."
                />

                <textarea
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-violet-400/40"
                  placeholder="Entry notes, arrival times, security rules..."
                />

                <textarea
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none focus:border-violet-400/40"
                  placeholder="Refund policy..."
                />
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-black"
            />

            <button
              type="submit"
              disabled={isSubmitting || checklist.some((item) => !item.ready && !item.optional)}
              className="w-full rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Publishing event..." : "Publish event"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function CreateEventPage() {
  return (
    <OrganizerAccessGate>
      <CreateEventPageContent />
    </OrganizerAccessGate>
  );
}
