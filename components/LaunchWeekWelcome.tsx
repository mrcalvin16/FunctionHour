"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// A quiet, temporary launch notice. No popup, overlay, or local storage.
const START = Date.parse("2026-10-22T00:00:00-05:00");
const END = Date.parse("2026-11-02T00:00:00-06:00");

export default function LaunchWeekWelcome() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      setActive(now >= START && now < END);
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (!active) return null;

  return (
    <div className="border-b border-zinc-200/70 bg-[#faf9f7]">
      <div className="mx-auto flex min-h-12 max-w-[1240px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 text-center sm:px-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-orange-700 ring-1 ring-orange-100">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          Now live
        </span>
        <span className="text-xs font-medium text-zinc-700 sm:text-sm">
          Good things are happening. Find your next experience.
        </span>
        <Link href="/events" className="group inline-flex items-center gap-1 text-xs font-bold text-violet-700 underline-offset-4 transition hover:underline focus-visible:underline sm:text-sm">
          Explore events <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
        </Link>
      </div>
    </div>
  );
}
