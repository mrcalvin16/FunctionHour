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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
    <main className="min-h-screen bg-white px-6 py-10 text-zinc-950">
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
            noValidate
            className="space-y-6 rounded-[2rem] border border-zinc-200 bg-white p-6"
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <div className="min-w-0"><label htmlFor="parkingInfo" className="mb-2 block text-sm font-bold text-zinc-900">Parking information <span className="text-zinc-500">(optional)</span></label>

</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <textarea
                  value={parkingInfo}
                  onChange={(e) => setParkingInfo(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Parking instructions, valet, nearby lots..."
                />

                <div className="min-w-0"><label htmlFor="entryNotes" className="mb-2 block text-sm font-bold text-zinc-900">Entry notes <span className="text-zinc-500">(optional)</span></label>

</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <div className="min-w-0"><label htmlFor="parkingInfo" className="mb-2 block text-sm font-bold text-zinc-900">Parking information <span className="text-zinc-500">(optional)</span></label>

</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <textarea
                  value={parkingInfo}
                  onChange={(e) => setParkingInfo(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Parking instructions, valet, nearby lots..."
                />

                <textarea
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Entry notes, arrival times, security rules..."
                />

                <div className="min-w-0"><label htmlFor="refundPolicy" className="mb-2 block text-sm font-bold text-zinc-900">Refund policy <span className="text-red-700">*</span></label>

{fieldFeedback("refundPolicy")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <div className="min-w-0"><label htmlFor="parkingInfo" className="mb-2 block text-sm font-bold text-zinc-900">Parking information <span className="text-zinc-500">(optional)</span></label>

</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <textarea
                  value={parkingInfo}
                  onChange={(e) => setParkingInfo(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Parking instructions, valet, nearby lots..."
                />

                <div className="min-w-0"><label htmlFor="entryNotes" className="mb-2 block text-sm font-bold text-zinc-900">Entry notes <span className="text-zinc-500">(optional)</span></label>

</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <div className="min-w-0"><label htmlFor="parkingInfo" className="mb-2 block text-sm font-bold text-zinc-900">Parking information <span className="text-zinc-500">(optional)</span></label>

</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <div className="min-w-0"><label htmlFor="description" className="mb-2 block text-sm font-bold text-zinc-900">Event description <span className="text-red-700">*</span></label>

{fieldFeedback("description")}</div>t";

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
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const fieldErrors: Record<string, string> = {
    name: name.trim() ? "" : "Enter an event name.",
    description: description.trim() ? "" : "Describe your event.",
    venueName: venueName.trim() ? "" : "Enter the venue name.",
    venueAddress: venueAddress.trim() ? "" : "Enter the street address.",
    city: city.trim() ? "" : "Enter the city.",
    stateValue: stateValue.trim() ? "" : "Enter the state or region.",
    eventDate: !eventDate ? "Choose the event date and time." : new Date(eventDate).getTime() <= Date.now() || !Number.isFinite(new Date(eventDate).getTime()) ? "Choose a future date and time." : "",
    price: price.trim() === "" ? "Enter a ticket price (0 for free)." : !Number.isFinite(Number(price)) || Number(price) < 0 ? "Enter a valid price of 0 or more." : "",
    totalTickets: !totalTickets.trim() ? "Enter ticket capacity." : !Number.isInteger(Number(totalTickets)) || Number(totalTickets) <= 0 ? "Enter a whole number greater than 0." : "",
    refundPolicy: refundPolicy.trim() ? "" : "Describe your refund policy.",
  };
  const missingCount = Object.values(fieldErrors).filter(Boolean).length;
  const fieldFeedback = (id: string) => attemptedPublish && fieldErrors[id] ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-red-700">{fieldErrors[id]}</p> : null;
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
    setAttemptedPublish(true);
    const firstInvalid = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (firstInvalid) {
      setError(`${missingCount} required field${missingCount === 1 ? "" : "s"} need attention. Review the highlighted fields below.`);
      requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
      return;
    }

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
            noValidate
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

            <div className="min-w-0"><label htmlFor="name" className="mb-2 block text-sm font-bold text-zinc-900">Event name <span className="text-red-700">*</span></label>
<input
                  id="name" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.name)} aria-describedby={attemptedPublish && fieldErrors.name ? "name-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Event name"
            />
{fieldFeedback("name")}</div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
              placeholder="Tell people what your event is about..."
            />

            <div className="min-w-0"><label htmlFor="category" className="mb-2 block text-sm font-bold text-zinc-900">Category <span className="text-zinc-500">(optional)</span></label>
<select
                  id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            >
              <option>Party</option>
              <option>Music</option>
              <option>Nightlife</option>
              <option>Festival</option>
              <option>Food</option>
              <option>Networking</option>
            </select>
</div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-xl font-black">Venue Location</h2>

              <div className="space-y-4">
                <div className="min-w-0"><label htmlFor="venueName" className="mb-2 block text-sm font-bold text-zinc-900">Venue name <span className="text-red-700">*</span></label>
<input
                  id="venueName" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueName)} aria-describedby={attemptedPublish && fieldErrors.venueName ? "venueName-error" : undefined}
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Venue name"
                />
{fieldFeedback("venueName")}</div>

                <div className="min-w-0"><label htmlFor="venueAddress" className="mb-2 block text-sm font-bold text-zinc-900">Street address <span className="text-red-700">*</span></label>
<input
                  id="venueAddress" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.venueAddress)} aria-describedby={attemptedPublish && fieldErrors.venueAddress ? "venueAddress-error" : undefined}
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                  placeholder="Street address"
                />
{fieldFeedback("venueAddress")}</div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0"><label htmlFor="city" className="mb-2 block text-sm font-bold text-zinc-900">City <span className="text-red-700">*</span></label>
<input
                  id="city" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.city)} aria-describedby={attemptedPublish && fieldErrors.city ? "city-error" : undefined}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="City"
                  />
{fieldFeedback("city")}</div>

                  <div className="min-w-0"><label htmlFor="stateValue" className="mb-2 block text-sm font-bold text-zinc-900">State / region <span className="text-red-700">*</span></label>
<input
                  id="stateValue" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.stateValue)} aria-describedby={attemptedPublish && fieldErrors.stateValue ? "stateValue-error" : undefined}
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                    placeholder="State"
                  />
{fieldFeedback("stateValue")}</div>
                </div>
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="eventDate" className="mb-2 block text-sm font-bold text-zinc-900">Event date and time <span className="text-red-700">*</span></label>
<input
                  id="eventDate" aria-required="true" aria-invalid={attemptedPublish && Boolean(fieldErrors.eventDate)} aria-describedby={attemptedPublish && fieldErrors.eventDate ? "eventDate-error" : undefined}
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
            />
{fieldFeedback("eventDate")}</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
                placeholder="Ticket price"
              />

              <input
                type="number"
                min="1"
                value={totalTickets}
                onChange={(e) => setTotalTickets(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-white/40"
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
                <div className="min-w-0"><label htmlFor="dressCode" className="mb-2 block text-sm font-bold text-zinc-900">Dress code <span className="text-zinc-500">(optional)</span></label>
<input
                  id="dressCode"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Dress code (All White, Upscale Casual, Festival Wear...)"
                />
</div>

                <div className="min-w-0"><label htmlFor="ageRequirement" className="mb-2 block text-sm font-bold text-zinc-900">Age requirement <span className="text-zinc-500">(optional)</span></label>
<select
                  id="ageRequirement"
                  value={ageRequirement}
                  onChange={(e) => setAgeRequirement(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                >
                  <option>18+</option>
                  <option>21+</option>
                  <option>All Ages</option>
                </select>
</div>

                <textarea
                  value={parkingInfo}
                  onChange={(e) => setParkingInfo(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Parking instructions, valet, nearby lots..."
                />

                <textarea
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Entry notes, arrival times, security rules..."
                />

                <textarea
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 outline-none focus:border-violet-400/40"
                  placeholder="Refund policy..."
                />
              </div>
            </div>

            <div className="min-w-0"><label htmlFor="image" className="mb-2 block text-sm font-bold text-zinc-900">Event image <span className="text-zinc-500">(optional)</span></label>
<input
                  id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-4 text-zinc-950 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-black"
            />
</div>

            <button
              type="submit"
              disabled={isSubmitting}
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
