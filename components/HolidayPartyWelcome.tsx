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
    <section aria-labelledby="holiday-party-heading" className="bg-[#fffaf7] px-4 py-1">
      <div className="relative mx-auto flex w-full max-w-[640px] items-center gap-3 overflow-hidden rounded-2xl border border-violet-200 bg-white py-1 pl-2 pr-10 sm:gap-3">
        <button type="button" onClick={dismiss} aria-label="Dismiss holiday party invitation" className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full text-zinc-600 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-700">
          <X size={18} aria-hidden="true" />
        </button>
        <div aria-hidden="true" className="h-10 w-11 shrink-0">
        <div className={`fh-holiday-scene origin-top-left scale-[.22] ${animate ? "fh-holiday-play" : ""}`}>
          <div className="fh-holiday-flyer"><span>YOU’RE INVITED</span><strong>Holiday<br />party</strong><span>LET’S CELEBRATE</span></div>
          <div className="fh-holiday-lights">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${1.2 + i * .2}s` }} />)}</div>
          <Image src="/chev-mascot.webp" alt="" width={100} height={100} className="fh-holiday-chev" />
          <div className="fh-holiday-gift"><span /></div>
          <div className="fh-holiday-lid"><span /></div>
        </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h2 id="holiday-party-heading" className="text-sm font-extrabold leading-tight tracking-tight text-zinc-950">Your holiday party starts here</h2>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-700">Office parties, Friendsmas & more.</p>
          </div>
          <Link href="/host/create" data-cta="holiday_create_event" className="fh-holiday-cta inline-flex min-h-11 max-w-full sm:shrink-0 items-center rounded-full bg-violet-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">Create your holiday event <span aria-hidden="true" className="ml-2">→</span></Link>
        </div>
      </div>
    </section>
  );
}
