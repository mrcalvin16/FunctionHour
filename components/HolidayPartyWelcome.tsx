"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISSED = "fh-holiday-2026-dismissed";
const PLAYED = "fh-holiday-2026-played";

export default function HolidayPartyWelcome() {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      const inSeason = now >= Date.parse("2026-11-01T00:00:00-05:00") &&
        now < Date.parse("2027-01-01T00:00:00-06:00");
      let dismissed = false;
      let played = true;
      try {
        dismissed = sessionStorage.getItem(DISMISSED) === "1";
        played = sessionStorage.getItem(PLAYED) === "1";
        if (inSeason && !dismissed) sessionStorage.setItem(PLAYED, "1");
      } catch { /* The invitation still works when browser storage is unavailable. */ }
      setVisible(inSeason && !dismissed);
      if (!played) setAnimate(true);
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  function dismiss() {
    setVisible(false);
    try { sessionStorage.setItem(DISMISSED, "1"); } catch { /* Optional persistence. */ }
  }

  if (!visible) return null;

  return (
    <section aria-labelledby="holiday-party-heading" className="bg-[#fffaf7] px-4 py-4">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 overflow-hidden rounded-3xl border border-violet-200 bg-white px-6 py-6 sm:flex-row sm:gap-8 sm:px-8">
        <button type="button" onClick={dismiss} aria-label="Dismiss holiday party invitation" className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-zinc-600 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700">
          <X size={20} aria-hidden="true" />
        </button>
        <div aria-hidden="true" className={`fh-holiday-scene shrink-0 ${animate ? "fh-holiday-play" : ""}`}>
          <div className="fh-holiday-flyer"><span>YOU’RE INVITED</span><strong>Holiday<br />party</strong><span>LET’S CELEBRATE</span></div>
          <div className="fh-holiday-lights">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${1.2 + i * .2}s` }} />)}</div>
          <Image src="/chev-mascot.webp" alt="" width={100} height={100} className="fh-holiday-chev" />
          <div className="fh-holiday-gift"><span /></div>
          <div className="fh-holiday-lid"><span /></div>
        </div>
        <div className="max-w-2xl pb-1 text-center sm:pr-7 sm:text-left">
          <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-violet-700">Our first holiday season together</p>
          <h2 id="holiday-party-heading" className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">Your holiday party starts here</h2>
          <p className="mt-2 text-sm text-zinc-700">Office party. Friendsmas. End-of-year celebration.</p>
          <p className="mt-1 text-sm text-zinc-700">You bring the people. We’ll help with the party.</p>
          <Link href="/host/create" data-cta="holiday_create_event" className="fh-holiday-cta mt-4 inline-flex min-h-11 items-center rounded-full bg-violet-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">Create your holiday event <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </div>
    </section>
  );
}
