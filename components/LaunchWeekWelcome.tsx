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
      <div className="mx-auto max-w-[1240px] px-5 pt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-center shadow-sm">
          <span aria-hidden="true" className="text-xl text-orange-600">✦</span>
          <p className="text-sm font-semibold text-zinc-900">We’re live! Your next experience starts here.</p>
          <Link href="/events" className="text-sm font-bold text-orange-700 underline underline-offset-4">Explore events →</Link>
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
