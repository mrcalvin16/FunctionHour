"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";

export default function CreateEventPage() {
  const router = useRouter();
  const {isLoaded, isSignedIn, userId, getToken} = useAuth();

  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const createEvent = useMutation(api.events.createEvent);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Party");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState("");
  const [totalTickets, setTotalTickets] = useState("");
  const [maxTicketsPerOrder, setMaxTicketsPerOrder] = useState("10");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    console.log("CLERK DEBUG", {
      isLoaded,
      isSignedIn,
      userId,
    });

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

    if (!name || !description || !location || !eventDate || !startTime || !price || !totalTickets) {
      setError("Please fill out all required fields.");
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

      const dateValue = new Date(`${eventDate}T${startTime}`).getTime();

      if (Number.isNaN(dateValue)) {
        throw new Error("Please choose a valid event date and start time.");
      }

      await createEvent({
        name,
        description,
        location,
        eventDate: dateValue,
        dateString: eventDate,
        price: Number(price),
        totalTickets: Number(totalTickets),
        maxTicketsPerOrder: Number(maxTicketsPerOrder),
        imageStorageId,
      });

      router.push("/events");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Event</h1>
          <p className="mt-2 text-white/60">
            Add your event details, ticket price, and event image.
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
            className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">
                Event Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                placeholder="Ex: Tech Fest x 2026"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                placeholder="Tell people what your event is about..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                placeholder="Ex: New Orleans, LA"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <label className="mb-3 block text-sm font-semibold text-white">
                Event Date & Time
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
                    Date
                  </p>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
                    Start Time
                  </p>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
                    End Time Optional
                  </p>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-white/40">
                Tap the date field to open the mini calendar picker.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ticket Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                  placeholder="25"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Total Tickets
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalTickets}
                  onChange={(e) => setTotalTickets(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                  placeholder="100"
                />
              </div>
              <label className="block text-sm font-semibold text-zinc-800">Maximum tickets per order
                <input required type="number" min="1" max="10" step="1" value={maxTicketsPerOrder} onChange={(e) => setMaxTicketsPerOrder(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900" />
                <span className="mt-2 block text-xs font-normal text-zinc-600">Set a purchase limit from 1 to 10. Total capacity is managed separately.</span>
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Event Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating Event..." : "Create Event"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}