import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { featuredCities, matchesDiscoveryCity } from "@/lib/discoveryCities";
import { formatEventDate, getEventLocation } from "@/app/events/eventPresentation";

export const revalidate = 600;
const slugOf = (city: string, state: string) => `${city}-${state}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function resolveCity(slug: string) {
  return featuredCities.find(([city, state]) => slugOf(city, state) === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = resolveCity(slug);
  if (!found) return { title: "City Not Found", robots: { index: false } };
  const [city, state] = found;
  return {
    title: `Events in ${city}, ${state} | FunctionHour`,
    description: `Discover upcoming events, parties, festivals and experiences in ${city}, ${state}. Explore local tickets on FunctionHour.`,
    alternates: { canonical: `/cities/${slug}` },
  };
}

export default async function CityLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = resolveCity(slug);
  if (!found) notFound();
  const [city, state] = found;
  let events: Awaited<ReturnType<typeof loadEvents>> = [];
  try {
    events = await loadEvents();
  } catch (error) {
    console.error("Could not load city events:", error);
  }
  const matches = events.filter((event) =>
    !event.isDemo && !event.demoHidden && matchesDiscoveryCity(event, `${city}, ${state}`)
  );
  return (
    <main className="min-h-screen bg-[#fffaf7] px-5 py-12 text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/cities" className="text-sm font-semibold text-violet-700">← All cities</Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">Events in {city}, {state}</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-600">
          Find parties, community events, festivals, and local experiences in {city}.
          Browse upcoming events and discover your next function.
        </p>
        {matches.length ? (
          <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Upcoming events">
            {matches.map((event) => (
              <Link key={event._id} href={`/events/${event._id}`} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-violet-400">
                <h2 className="text-xl font-bold">{event.name}</h2>
                <p className="mt-2 text-sm text-zinc-600">{formatEventDate(event)} · {getEventLocation(event)}</p>
                <p className="mt-3 line-clamp-3 text-sm text-zinc-700">{event.description}</p>
                <span className="mt-4 inline-block font-semibold text-violet-700">View event →</span>
              </Link>
            ))}
          </section>
        ) : (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
            <p>No upcoming events are listed for {city} yet.</p>
            <Link className="mt-3 inline-block font-semibold text-violet-700" href="/events">Browse all events →</Link>
          </div>
        )}
      </div>
    </main>
  );
}

async function loadEvents() {
  return getConvexClient().query(api.events.getAll, {});
}
