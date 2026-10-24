import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About FunctionHour | Event Discovery, Ticketing & Event Management",
  description: "Learn about FunctionHour, an event discovery and ticketing platform helping people find experiences and organizers create, promote, and manage events.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/" className="text-sm font-semibold text-zinc-600 hover:text-zinc-950">← FunctionHour</Link>
      </div>
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-12 md:pt-24">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">About FunctionHour</p>
        <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">More experiences. More connections.</h1>
        <p className="mt-8 max-w-3xl text-xl leading-relaxed text-zinc-600">FunctionHour is an event discovery, ticketing, and event management platform that helps people find experiences and gives organizers tools to bring them to life.</p>
        <div className="mt-16 grid gap-10 border-t border-zinc-200 pt-12 md:grid-cols-2">
          <div><h2 className="text-2xl font-bold">Discover your next function</h2><p className="mt-4 leading-relaxed text-zinc-600">Explore concerts, festivals, nightlife, food, arts, networking, and community events. Browse experiences and purchase tickets in one place.</p></div>
          <div><h2 className="text-2xl font-bold">Built for organizers, too</h2><p className="mt-4 leading-relaxed text-zinc-600">Create and publish events, manage tickets and guest lists, promote experiences, and check in attendees with organizer tools designed to make hosting easier.</p></div>
        </div>
        <div className="mt-16 flex flex-wrap gap-4"><Link href="/events" className="rounded-full bg-zinc-950 px-7 py-3 font-semibold text-white">Explore events</Link><Link href="/organizer/pricing" className="rounded-full border border-zinc-300 px-7 py-3 font-semibold">Host an event</Link></div>
        <p className="mt-16 text-sm text-zinc-500">FunctionHour is a technology platform. Individual event organizers are responsible for their event details and operations.</p>
      </section>
      <Footer />
    </main>
  );
}
