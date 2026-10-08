"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DiscoveryNav from "@/components/DiscoveryNav";
import EventImage from "@/components/events/EventImage";
import { formatEventDate, getEventCategory, getEventLocation, getTicketListingLabel, type DiscoveryEvent } from "@/app/events/eventPresentation";
import { ArrowUpRight, BadgeCheck, CalendarDays, Check, Globe, Instagram, MapPin, Users } from "lucide-react";

function publicLink(value?: string) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export default function OrganizerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");
  const data = useQuery(api.organizers.getOrganizerByUserId, { userId: id });
  const isFollowing = useQuery(api.followedOrganizers.isFollowingOrganizer, { organizerUserId: id });
  const followerCount = useQuery(api.followedOrganizers.getFollowerCount, { organizerUserId: id });
  const toggleFollow = useMutation(api.followedOrganizers.toggleFollowOrganizer);

  async function follow() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/organizers/${id}`)}`);
      return;
    }
    setFollowBusy(true);
    setFollowError("");
    try { await toggleFollow({ organizerUserId: id }); }
    catch { setFollowError("We couldn't update your follow. Please try again."); }
    finally { setFollowBusy(false); }
  }

  if (data === undefined || !data?.organizer) {
    return <div className="min-h-screen bg-[#faf9fd] text-zinc-950"><DiscoveryNav /><main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {data === undefined ? <p role="status" className="text-zinc-700">Loading organizer profile…</p> : <><h1 className="text-3xl font-black">Organizer not found</h1><p className="mt-3 text-zinc-700">This profile is unavailable. Discover another experience instead.</p><Link href="/events" className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-bold text-white">Browse events</Link></>}
    </main></div>;
  }

  const { organizer, events } = data;
  // Accept the older response during a staggered frontend/backend deployment.
  const pastEvents = data.pastEvents ?? [];
  const allEvents = [...events, ...pastEvents];
  const displayName = organizer.organizerName || organizer.name || "Organizer";
  const cities = [...new Set(allEvents.map((event) => event.city?.trim()).filter((city): city is string => Boolean(city)))].sort();
  const categories = [...new Set(allEvents.map(getEventCategory))].sort();
  const website = publicLink(organizer.website);
  const instagram = organizer.instagram?.trim()
    ? publicLink(/^https?:\/\//i.test(organizer.instagram) ? organizer.instagram : `https://instagram.com/${organizer.instagram.replace(/^@/, "").trim()}`)
    : null;

  return <div className="min-h-screen bg-[#faf9fd] text-zinc-950">
    <DiscoveryNav />
    <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
      <Link href="/events" className="mb-5 inline-flex min-h-10 items-center text-sm font-bold text-violet-800 hover:underline">← Browse events</Link>
      <section aria-labelledby="organizer-name" className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-violet-200 via-fuchsia-100 to-orange-100 sm:h-56">
          {organizer.bannerUrl ? <img src={organizer.bannerUrl} alt="" className="h-full w-full object-cover" /> : <div aria-hidden="true" className="absolute inset-0 overflow-hidden"><div className="absolute -right-12 -top-28 h-96 w-96 rounded-full border-[35px] border-violet-300/40" /><div className="absolute left-12 top-16 h-64 w-64 rounded-full border-[24px] border-orange-200/60" /></div>}
        </div>
        <div className="relative px-5 pb-7 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-violet-100 text-3xl font-black text-violet-900 shadow-sm sm:-mt-16 sm:h-32 sm:w-32">
              {organizer.avatarUrl ? <img src={organizer.avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : displayName.charAt(0).toUpperCase()}
            </div>
            <button type="button" onClick={() => void follow()} disabled={!isLoaded || followBusy || userId === id} aria-pressed={Boolean(isFollowing)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${isFollowing ? "border border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100" : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm hover:brightness-95"}`}>
              {isFollowing && <Check size={16} aria-hidden="true" />}{userId === id ? "Your organizer profile" : followBusy ? "Updating…" : isFollowing ? "Following" : "Follow organizer"}
            </button>
          </div>
          <div className="mt-5 flex items-center gap-2"><h1 id="organizer-name" className="min-w-0 break-words text-3xl font-black tracking-tight sm:text-4xl">{displayName}</h1>{organizer.isVerifiedOrganizer && <span role="img" aria-label="Verified organizer" title="Verified organizer" className="shrink-0"><BadgeCheck className="h-7 w-7 fill-blue-500 stroke-white" aria-hidden="true" /></span>}</div>
          <p className="mt-2 text-sm font-medium text-zinc-700">Organizer on Function Hour</p>
          {followError && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{followError}</p>}
          <div className="mt-6 grid grid-cols-3 divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-zinc-50 py-4">
            {[{ label: "Upcoming", value: events.length }, { label: "Past events", value: pastEvents.length }, { label: "Followers", value: followerCount }].map((stat) => <div key={stat.label} className="px-2 text-center"><p className="text-2xl font-black sm:text-3xl">{stat.value ?? "—"}</p><p className="mt-1 text-xs font-semibold text-zinc-700 sm:text-sm">{stat.label}</p></div>)}
          </div>
        </div>
      </section>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6" aria-labelledby="about-organizer">
          <p className="text-xs font-black uppercase tracking-widest text-violet-800">Meet your host</p>
          <h2 id="about-organizer" className="mt-2 text-xl font-black">About {displayName}</h2>
          <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-zinc-800">{organizer.bio?.trim() || `Explore upcoming experiences and past events from ${displayName}. Follow this organizer to find them in your following feed.`}</p>
          {cities.length > 0 && <div className="mt-6 border-t border-zinc-200 pt-5"><h3 className="flex items-center gap-2 text-sm font-bold"><MapPin size={16} aria-hidden="true" />Where they host</h3><div className="mt-3 flex flex-wrap gap-2">{cities.map((city) => <span key={city} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-950">{city}</span>)}</div></div>}
          {categories.length > 0 && <div className="mt-6 border-t border-zinc-200 pt-5"><h3 className="text-sm font-bold">Their experiences</h3><div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <span key={category} className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900">{category}</span>)}</div></div>}
          {(website || instagram) && <div className="mt-6 space-y-2 border-t border-zinc-200 pt-5"><h3 className="mb-3 text-sm font-bold">Connect with the organizer</h3>{website && <a href={website} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50"><Globe size={16} aria-hidden="true" />Website<ArrowUpRight size={16} aria-hidden="true" className="ml-auto" /></a>}{instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50"><Instagram size={16} aria-hidden="true" />Instagram<ArrowUpRight size={16} aria-hidden="true" className="ml-auto" /></a>}</div>}
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-zinc-700"><Users size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Follow to keep this organizer in your Following feed.</p>
        </aside>

        <div className="min-w-0">
          <nav aria-label="Organizer events" className="mb-6 flex gap-2"><a href="#upcoming-events" className="inline-flex min-h-11 items-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-bold text-violet-900">Upcoming · {events.length}</a><a href="#past-events" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800">Past events · {pastEvents.length}</a></nav>
          <EventSection id="upcoming-events" title="Upcoming events" subtitle="Your next chance to join this organizer." events={events} />
          <div className="mt-10"><EventSection id="past-events" title="Past events" subtitle="A look back at this organizer's previous experiences." events={pastEvents} past /></div>
          {data.historyLimited && <p className="mt-5 text-xs text-zinc-700">Showing events from this organizer’s 500 most recently created listings.</p>}
        </div>
      </div>
    </main>
  </div>;
}

function EventSection({ id, title, subtitle, events, past = false }: { id: string; title: string; subtitle: string; events: DiscoveryEvent[]; past?: boolean }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28">
    <h2 id={`${id}-title`} className="text-2xl font-black tracking-tight">{title}</h2><p className="mt-2 text-sm text-zinc-700">{subtitle}</p>
    {events.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-white p-6"><p className="font-bold">{past ? "No past events to show yet" : "No upcoming events right now"}</p><p className="mt-2 text-sm leading-6 text-zinc-700">{past ? "Ended public events will appear here so you can explore this organizer's history." : "Follow this organizer to find them again, or browse other events while you wait."}</p>{!past && <Link href="/events" className="mt-4 inline-flex text-sm font-bold text-violet-800 hover:underline">Discover events →</Link>}</div> : <div className="mt-5 grid gap-5 sm:grid-cols-2">{events.map((event) => <Link key={event._id} href={`/events/${event._id}`} className="group min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-violet-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">
      <div className="relative aspect-[16/10] overflow-hidden bg-violet-50"><EventImage storageId={event.imageStorageId} imageUrl={event.imageUrl} alt={event.name || "Event"} className="h-full w-full object-cover" fallbackClassName="flex h-full w-full items-center justify-center bg-violet-50 text-sm font-semibold text-violet-900" /><span className={`absolute left-3 top-3 rounded-lg border px-3 py-1.5 text-xs font-bold ${past ? "border-zinc-200 bg-white text-zinc-800" : "border-violet-200 bg-white text-violet-900"}`}>{past ? "Event ended" : getEventCategory(event)}</span></div>
      <div className="p-5"><h3 className="break-words text-xl font-black leading-snug">{event.name}</h3>{event.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-700">{event.description}</p>}<p className="mt-4 flex items-start gap-2 text-sm font-semibold text-violet-900"><CalendarDays size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{formatEventDate(event)}</p><p className="mt-2 flex items-start gap-2 text-sm text-zinc-800"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{getEventLocation(event)}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4">{!past && <span className="text-sm font-black text-zinc-950">{getTicketListingLabel(event)}</span>}<span className="text-sm font-bold text-violet-800 group-hover:underline">{past ? "View event details →" : "View event →"}</span></div></div>
    </Link>)}</div>}
  </section>;
}
