"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { id } = use(params);

  const event = useQuery(api.events.getById, {
    eventId: id as Id<"events">,
  });

  const updateEvent = useMutation(api.events.updateEvent);

  const [name, setName] = useState("");
  const [dateString, setDateString] = useState("");
  const [endDateString, setEndDateString] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!event) return;

    setName(event.name ?? "");
    setDateString(event.dateString ?? "");
    setEndDateString(event.endDateString ?? "");
    setLocation(event.location ?? "");
    setPrice(event.price?.toString() ?? "");
    setTotalTickets(event.totalTickets?.toString() ?? "");
    setDescription(event.description ?? "");
  }, [event]);

  async function handleUpdateEvent() {
    if (!event) return;

    if (!name.trim()) {
      alert("Event name is required.");
      return;
    }

    if (endDateString && (!dateString || !Number.isFinite(new Date(endDateString).getTime()) || new Date(endDateString).getTime() <= new Date(dateString).getTime())) {
      alert("End time must be after the start time.");
      return;
    }
    setIsSaving(true);

    try {
      await updateEvent({
        eventId: event._id,
        name,
        description,
        location,
        dateString,
        eventDate: dateString ? new Date(dateString).getTime() : undefined,
        ...(endDateString ? { endDateString, endDate: new Date(endDateString).getTime() } : {}),
        price: price ? Number(price) : undefined,
        totalTickets: totalTickets ? Number(totalTickets) : undefined,
      });

      router.push(`/events/${event._id}`);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Something went wrong updating the event.");
    } finally {
      setIsSaving(false);
    }
  }

  if (event === undefined) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading event...
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Link href="/events" className="text-purple-400 hover:underline">
          Back to events
        </Link>
      </main>
    );
  }

  const isOwner = user?.id && event.userId === user.id;

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">You can’t edit this event</h1>
        <p className="text-white/60">Only the event creator can edit this event.</p>
        <Link href={`/events/${event._id}`} className="text-purple-400 hover:underline">
          Back to event
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href={`/events/${event._id}`} className="mb-4 inline-block text-sm text-white/60 hover:text-white">
              ← Back to event
            </Link>
            <h1 className="text-4xl font-bold">Edit Event</h1>
            <p className="mt-2 text-white/60">Update your event details.</p>
          </div>

          <SignedIn>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full bg-white px-5 py-2 font-semibold text-black">
                Login
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        <form className="space-y-5 rounded-3xl border border-white/10 bg-zinc-950 p-8">
          <div>
            <label className="text-sm text-white/60">Event Title</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-white/60">Date</label>
            <input
              type="datetime-local"
              value={dateString}
              onChange={(e) => setDateString(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-white/60">Event end date and time (optional for existing events)</label>
            <input
              type="datetime-local"
              min={dateString || undefined}
              value={endDateString}
              onChange={(e) => setEndDateString(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-white/60">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-white/60">Ticket Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-white/60">Total Tickets</label>
            <input
              type="number"
              value={totalTickets}
              onChange={(e) => setTotalTickets(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-white/60">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleUpdateEvent}
            disabled={isSaving}
            className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>
    </main>
  );
}