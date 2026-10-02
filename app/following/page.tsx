"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";
import EventList from "@/app/events/components/EventList";
import { isEventUpcoming, type DiscoveryEvent } from "@/app/events/eventPresentation";

function cityKey(city: string, state: string) {
  return `${city.trim()}|${state.trim()}`.toLowerCase();
}

export default function FollowingPage() {
  const events = useQuery(api.events.getAll, {});
  const follows = useQuery(api.discoveryFollows.getMyFollows);
  const savedEventIds = useQuery(api.savedEvents.getSavedEventIds) || [];
  const toggleCity = useMutation(api.discoveryFollows.toggleCity);
  const setAlerts = useMutation(api.discoveryFollows.setAlertsEnabled);
  const markSeen = useMutation(api.discoveryFollows.markAlertsSeen);
  const toggleSaved = useMutation(api.savedEvents.toggleSavedEvent);
  const [error, setError] = useState("");
  const [cityInput, setCityInput] = useState("");

  const availableCities = useMemo(() => {
    const cities = new Map<string, { city: string; state: string }>();
    for (const event of (events ?? []) as DiscoveryEvent[]) {
      if (!isEventUpcoming(event) || !event.city?.trim()) continue;
      const city = event.city.trim();
      const state = event.state?.trim() ?? "";
      cities.set(cityKey(city, state), { city, state });
    }
    return [...cities.values()].sort((a, b) => a.city.localeCompare(b.city));
  }, [events]);

  const followedEvents = useMemo(() => {
    if (!follows) return [];
    return ((events ?? []) as DiscoveryEvent[])
      .filter(isEventUpcoming)
      .filter((event) => follows.cities.some((item) => item.cityKey === cityKey(event.city ?? "", event.state ?? "")) ||
        follows.organizers.some((item) => item.organizerUserId === (event.organizerId || event.userId)))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [events, follows]);

  const newCount = follows?.alertsEnabled ? followedEvents.filter((event) => {
    const followedAt = Math.min(
      ...[
        ...follows.cities.filter((item) => item.cityKey === cityKey(event.city ?? "", event.state ?? "")).map((item) => item.createdAt),
        ...follows.organizers.filter((item) => item.organizerUserId === (event.organizerId || event.userId)).map((item) => item.createdAt),
      ],
    );
    return (event.createdAt ?? 0) > Math.max(follows.lastSeenAt, followedAt);
  }).length : 0;

  async function handle(action: () => Promise<unknown>) {
    setError("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save your choice."); }
  }

  return <main className="safe-x min-h-screen bg-[#fffaf7] text-zinc-950">
    <DiscoveryNav />
    <section className="mx-auto max-w-[1240px] px-5 py-12 sm:px-7 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Your discovery feed</p>
      <h1 className="mt-2 text-4xl font-black">Following</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">Follow cities and organizers to keep their upcoming events in one place.</p>
      <SignedOut><div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6"><p className="font-bold">Sign in to save your follows.</p><SignInButton mode="modal"><button type="button" className="mt-4 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white">Sign in</button></SignInButton></div></SignedOut>
      <SignedIn>
        {follows === undefined || events === undefined ? <p className="mt-8">Loading your feed…</p> : <>
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-xl font-black">Cities with upcoming events</h2>
              <p className="mt-1 text-sm text-zinc-600">Choose the places you want to follow.</p>
              <div className="mt-5 flex flex-wrap gap-2">{availableCities.map(({ city, state }) => {
                const following = follows?.cities.some((item) => item.cityKey === cityKey(city, state));
                return <button key={cityKey(city, state)} type="button" aria-pressed={following} onClick={() => void handle(() => toggleCity({ city, state }))} className={`rounded-full border px-4 py-2 text-sm font-bold ${following ? "border-violet-600 bg-violet-50 text-violet-800" : "border-zinc-300 text-zinc-800 hover:border-violet-400"}`}>{city}{state ? `, ${state}` : ""} {following ? "✓" : "+"}</button>;
              })}</div>
              <form className="mt-6 flex flex-wrap gap-2" onSubmit={(event) => {
                event.preventDefault();
                const [city, state, ...extra] = cityInput.split(",").map((part) => part.trim());
                if (!city || !state || extra.length) { setError("Enter a city and state, such as New Orleans, LA."); return; }
                void handle(async () => { await toggleCity({ city, state }); setCityInput(""); });
              }}>
                <label className="sr-only" htmlFor="follow-city">Follow another city</label>
                <input id="follow-city" value={cityInput} onChange={(event) => setCityInput(event.target.value)} maxLength={145} placeholder="City, state (e.g. Chicago, IL)" className="min-h-11 min-w-[220px] flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950" />
                <button type="submit" className="rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white">Follow city</button>
              </form>
              {follows?.cities.some((item) => !availableCities.some(({ city, state }) => item.cityKey === cityKey(city, state))) && <div className="mt-5"><p className="text-sm font-bold">Other cities you follow</p><div className="mt-2 flex flex-wrap gap-2">{follows.cities.filter((item) => !availableCities.some(({ city, state }) => item.cityKey === cityKey(city, state))).map((item) => <button key={item.cityKey} type="button" onClick={() => void handle(() => toggleCity({ city: item.city, state: item.state }))} className="rounded-full border border-violet-600 bg-violet-50 px-4 py-2 text-sm text-violet-800">{item.city}, {item.state} ✓</button>)}</div></div>}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-xl font-black">New event alerts</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">Show new events from followed cities and organizers here. This setting controls in-app alerts; it does not subscribe you to email or text messages.</p>
              <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={follows?.alertsEnabled ?? false} onChange={(event) => void handle(() => setAlerts({ enabled: event.target.checked }))} className="h-5 w-5 accent-violet-700" /> Alert me to new events here</label>
              {follows?.alertsEnabled && <p aria-live="polite" className="mt-4 text-sm text-violet-800">{newCount} new event{newCount === 1 ? "" : "s"} from places and hosts you follow.</p>}
              {newCount > 0 && <button type="button" onClick={() => void handle(() => markSeen({}))} className="mt-3 text-sm font-bold text-violet-700 underline">Mark all seen</button>}
              {follows && follows.organizers.length > 0 && <div className="mt-5"><p className="text-sm text-zinc-600">Following {follows.organizers.length} organizer{follows.organizers.length === 1 ? "" : "s"}. Manage them on their profiles:</p><div className="mt-2 flex flex-wrap gap-2">{follows.organizers.map((item) => <Link key={item.organizerUserId} href={`/organizers/${encodeURIComponent(item.organizerUserId)}`} className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-bold text-violet-700 hover:border-violet-400">{item.name} →</Link>)}</div></div>}
            </section>
          </div>
          {followedEvents.length ? <EventList events={followedEvents} savedEventIds={savedEventIds} onToggleSave={(id: Id<"events">) => void handle(() => toggleSaved({ eventId: id }))} /> : <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 text-center"><p className="font-bold">No upcoming events from your follows yet.</p><Link href="/events" className="mt-3 inline-block text-sm font-bold text-violet-700 underline">Browse all events</Link></div>}
        </>}
      </SignedIn>
    </section>
    <Footer />
  </main>;
}
