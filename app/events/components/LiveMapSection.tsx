"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

type LiveMapSectionProps = {
  nearbyCount: number;
};

export default function LiveMapSection({
  nearbyCount,
}: LiveMapSectionProps) {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-10 sm:px-7 lg:px-8">
      <div className="overflow-hidden rounded-[1.8rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_24px_70px_rgba(24,24,27,0.08)] dark:border-white/10 dark:bg-[#0d0d10] dark:text-white">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-700 dark:text-orange-300">
              Explore by area
            </p>

            <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-zinc-950 dark:text-white sm:text-4xl">
              Find what’s happening near you.
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              Explore events by neighborhood, venue, category, and distance.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Open live map
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-700 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
                {nearbyCount} {nearbyCount === 1 ? "experience" : "experiences"} nearby
              </span>
            </div>
          </div>

          <div className="relative min-h-[340px] overflow-hidden border-t border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-black lg:min-h-[380px] lg:border-l lg:border-t-0">
            <div className="absolute inset-0 opacity-40 dark:opacity-20 [background-image:linear-gradient(rgba(113,113,122,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(113,113,122,0.18)_1px,transparent_1px)] [background-size:54px_54px] dark:[background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)]" />

            <div className="absolute left-[25%] top-[28%] h-4 w-4 rounded-full border-4 border-white bg-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.65)] dark:border-black" />
            <div className="absolute left-[58%] top-[38%] h-4 w-4 rounded-full border-4 border-white bg-violet-500 shadow-[0_0_24px_rgba(139,92,246,0.65)] dark:border-black" />
            <div className="absolute left-[43%] top-[62%] h-4 w-4 rounded-full border-4 border-white bg-orange-500 shadow-[0_0_24px_rgba(249,115,22,0.65)] dark:border-black" />

            <div className="absolute bottom-6 left-6 right-6 rounded-[1.5rem] border border-zinc-200 bg-white/95 p-5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/90 sm:left-auto sm:w-[340px]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black text-zinc-950 dark:text-white">Function Hour Live Map</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Events, venues, and neighborhoods
                  </p>
                </div>
              </div>

              <Link
                href="/map"
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-2.5 text-xs font-black text-zinc-900 transition hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
              >
                Explore the map
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
