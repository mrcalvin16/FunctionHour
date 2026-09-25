import Link from "next/link";

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-400">Explore</p>
        <h1 className="mt-4 text-2xl sm:text-3xl sm:text-5xl font-black">Discover what’s happening.</h1>
        <p className="mt-4 max-w-2xl text-zinc-400">
          Browse nightlife, festivals, pop-ups, networking events, and cultural experiences.
        </p>
        <Link href="/events" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 font-bold text-black">
          Browse Events
        </Link>
      </section>
    </main>
  );
}
