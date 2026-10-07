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

          <div className="relative min-h-[340px] overflow-hidden border-t border-zinc-200 bg-[#faf8f5] dark:border-white/10 dark:bg-black lg:min-h-[380px] lg:border-l lg:border-t-0">
            {/* Decorative map preview; actual event locations are on /map. */}
            <svg aria-hidden="true" focusable="false" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
              <rect width="640" height="400" fill="#faf8f5" />
              <path d="M-30 302C120 208 138 350 270 269S437 157 678 203" fill="none" stroke="#e0eff0" strokeWidth="48" />
              <path d="M-30 302C120 208 138 350 270 269S437 157 678 203" fill="none" stroke="#f1f9f9" strokeWidth="25" />
              <path d="M75 30h114l24 65-36 57H60l-22-66zM436 33h120l36 69-31 49H442l-22-52zM318 310h107l20 58H303z" fill="#eaf0e5" />
              <g fill="none" stroke="#ffffff" strokeWidth="16" strokeLinejoin="round">
                <path d="M-20 80H276L364 158H665M-20 177H182L290 70H662M114-20v181l112 110v150M357-20v105L470 198v224M-20 361l165-104h513" />
              </g>
              <g fill="none" stroke="#ddd8d1" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M-20 80H276L364 158H665M-20 177H182L290 70H662M114-20v181l112 110v150M357-20v105L470 198v224M-20 361l165-104h513" />
              </g>
              <path d="M145 104H264L340 181H475" fill="none" stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M264 104v110l-63 63" fill="none" stroke="#fdba74" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              {[[145,104,"#7c3aed"],[340,181,"#7c3aed"],[201,277,"#ea580c"]].map(([x,y,color]) => (
                <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                  <circle r="20" fill={String(color)} opacity="0.08" />
                  <circle r="11" fill="white" stroke="#e4e4e7" />
                  <circle r="6" fill={String(color)} />
                </g>
              ))}
            </svg>
            <span className="absolute left-5 top-5 rounded-full border border-white bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600 shadow-sm">Map preview</span>

            <div className="absolute bottom-6 left-6 right-6 rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(24,24,27,.08)] dark:border-white/15 dark:bg-zinc-950/90 sm:left-auto sm:w-[340px]">
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
