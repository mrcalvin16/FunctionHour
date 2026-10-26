"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedOut } from "@clerk/nextjs";

// A lightweight launch-month welcome. Automatically retires after November 21.
const START = Date.parse("2026-10-22T00:00:00-05:00");
const END = Date.parse("2026-11-22T00:00:00-06:00");

const confetti = [
  { left: "5%", top: "17%", rotate: "-20deg", delay: "0s", color: "#f97316" },
  { left: "14%", top: "73%", rotate: "32deg", delay: ".4s", color: "#a855f7" },
  { left: "28%", top: "11%", rotate: "45deg", delay: ".9s", color: "#ec4899" },
  { left: "43%", top: "81%", rotate: "-35deg", delay: ".2s", color: "#f97316" },
  { left: "59%", top: "15%", rotate: "20deg", delay: "1.1s", color: "#a855f7" },
  { left: "72%", top: "79%", rotate: "-45deg", delay: ".6s", color: "#ec4899" },
  { left: "85%", top: "17%", rotate: "35deg", delay: "1.4s", color: "#f97316" },
  { left: "96%", top: "72%", rotate: "-25deg", delay: ".8s", color: "#a855f7" },
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
    <section aria-label="FunctionHour launch month" className="relative isolate overflow-hidden border-b border-orange-100 bg-[#fff7f0]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((piece, index) => (
          <span
            key={index}
            className="fh-launch-month-confetti absolute h-2.5 w-1.5 rounded-[2px]"
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
      <div className="relative mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-5 py-5 sm:px-7 md:flex-row md:gap-7 md:py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className="fh-launch-month-celebrate mt-0.5 text-2xl">🎉</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-700">Launch month · FunctionHour is live</p>
            <p className="mt-1 text-lg font-black leading-tight tracking-[-0.03em] text-zinc-950 sm:text-xl">
              Your next great experience starts here.
            </p>
            <p className="mt-1 text-sm text-zinc-700">Host or attend your first event. Your next great memory is one click away.</p>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2 sm:w-auto md:justify-end">
          <SignedOut>
            <Link href="/sign-up" data-cta="launch_month_sign_up" className="fh-launch-month-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_22px_rgba(109,40,217,0.2)] transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">
              <span aria-hidden="true" className="fh-launch-month-arrow">↗</span> Sign up free
            </Link>
          </SignedOut>
        </div>
      </div>
    </section>
  );
}
