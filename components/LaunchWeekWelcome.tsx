"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const START = Date.parse("2026-10-22T00:00:00-05:00");
const END = Date.parse("2026-11-02T00:00:00-06:00");
const KEY = "fh-launch-week-welcome-2026";

export default function LaunchWeekWelcome() {
  const [active, setActive] = useState(false);
  const [show, setShow] = useState(false);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const now = Date.now();
    if (now < START || now >= END) return;
    setActive(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotion(!reduced);
    try {
      if (localStorage.getItem(KEY)) return;
      localStorage.setItem(KEY, "seen");
    } catch { /* Storage can be blocked; welcome remains dismissible. */ }
    setShow(true);
  }, []);

  if (!active) return null;

  return (
    <>
      <div className="mx-auto max-w-[1240px] px-5 pt-4 sm:pt-5">
        <div className="relative isolate overflow-hidden rounded-[1.6rem] border border-orange-200 bg-white shadow-[0_8px_30px_rgba(124,58,237,0.08)]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-orange-50 via-white to-violet-50" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-20 h-44 w-44 rounded-full border-[22px] border-orange-200/35" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -bottom-24 h-48 w-48 rounded-full border-[24px] border-violet-200/40" />
          <div className="relative flex flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:justify-between sm:gap-6 sm:px-7">
            <div className="flex min-w-0 items-center gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-violet-600 text-2xl text-white shadow-lg shadow-orange-500/15" aria-hidden="true">
                ✦
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 motion-safe:animate-pulse" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-800">Just launched</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">FunctionHour is live</span>
                </div>
                <p className="mt-1.5 text-lg font-black leading-tight tracking-tight text-zinc-950 sm:text-xl">Your city. Your people. Your next experience.</p>
                <p className="mt-1 text-xs font-medium text-zinc-600 sm:text-sm">The doors are open. Find something worth going out for.</p>
              </div>
            </div>
            <Link href="/events" className="group inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:w-auto">
              Explore events <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">↗</span>
            </Link>
          </div>
        </div>
      </div>
      {show && (
        <div role="dialog" aria-modal="true" aria-labelledby="launch-week-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/65 px-4 py-8" onKeyDown={(event) => { if (event.key === "Escape") setShow(false); }}>
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white p-8 text-center shadow-2xl sm:p-12">
            <button type="button" autoFocus onClick={() => setShow(false)} aria-label="Close launch welcome" className="absolute right-5 top-5 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-bold text-zinc-700 hover:bg-zinc-100">Skip ✕</button>
            <div aria-hidden="true" className={motion ? "animate-bounce text-5xl text-orange-500" : "text-5xl text-orange-500"}>✦</div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-orange-700">FunctionHour is live</p>
            <h2 id="launch-week-title" className="mt-3 text-4xl font-black leading-tight tracking-tight text-zinc-950 sm:text-5xl">The city is yours.<br />Go experience it.</h2>
            <p className="mx-auto mt-5 max-w-sm text-base text-zinc-600">Discover events, find your people, and make something happen.</p>
            <Link href="/events" onClick={() => setShow(false)} className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-orange-600 px-8 font-black text-white hover:bg-orange-700">Explore Events →</Link>
            <p className="mt-5 text-xs text-zinc-500">Welcome to FunctionHour.</p>
          </div>
        </div>
      )}
    </>
  );
}
