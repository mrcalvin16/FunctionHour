"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedOut } from "@clerk/nextjs";

// A lightweight launch-month welcome. Automatically retires after November 21.
const START = Date.parse("2026-10-22T00:00:00-05:00");
const END = Date.parse("2026-11-22T00:00:00-06:00");

const confetti = [
  { left: "9%", top: "17%", rotate: "-20deg", delay: "0s", color: "#f97316" },
  { left: "32%", top: "82%", rotate: "32deg", delay: ".4s", color: "#a855f7" },
  { left: "71%", top: "14%", rotate: "45deg", delay: ".9s", color: "#ec4899" },
  { left: "91%", top: "77%", rotate: "-35deg", delay: ".2s", color: "#f97316" },
];

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
    <section aria-label="FunctionHour launch month" className="bg-[#fffaf7] px-4 py-2.5 sm:py-3">
      <div className="relative mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 overflow-hidden rounded-full border border-orange-200/80 bg-white px-4 py-2.5 shadow-[0_3px_14px_rgba(60,35,65,0.05)] sm:px-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40">
          {confetti.map((piece, index) => (
            <span
              key={index}
              className="fh-launch-month-confetti absolute h-1.5 w-1 rounded-[1px]"
              style={{
                left: piece.left,
                top: piece.top,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotate})`,
                animationDelay: piece.delay,
              }}
            />
          ))}
        </div>
        <span aria-hidden="true" className="fh-launch-month-celebrate relative text-base">🎉</span>
        <p className="relative text-center text-xs font-semibold leading-5 text-zinc-700 sm:text-sm">
          <span className="font-extrabold text-orange-700">Launch month</span>
          <span className="mx-1.5 text-zinc-300" aria-hidden="true">·</span>
          Host or attend your first event
        </p>
        <SignedOut>
          <Link
            href="/sign-up"
            data-cta="launch_month_sign_up"
            className="relative inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-full bg-violet-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            Join free <span aria-hidden="true" className="fh-launch-month-arrow">↗</span>
          </Link>
        </SignedOut>
      </div>
    </section>
  );
}
