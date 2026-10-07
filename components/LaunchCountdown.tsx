"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// October 19, 2026 at midnight in America/Chicago (CDT).
const launch = Date.parse("2026-10-19T00:00:00-05:00");
const end = Date.parse("2026-10-20T00:00:00-05:00");

export default function LaunchCountdown() {
  const [now, setNow] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(Date.now()); };
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const launched = now !== null && now >= launch && now < end;
  useEffect(() => {
    if (!launched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem("fh-launch-confetti-2026")) return;
      sessionStorage.setItem("fh-launch-confetti-2026", "shown");
    } catch { /* Celebration still works when storage is unavailable. */ }
    setCelebrate(true);
    const timer = window.setTimeout(() => setCelebrate(false), 7000);
    return () => clearTimeout(timer);
  }, [launched]);
  if (now !== null && now >= end) return null;
  const seconds = Math.max(0, Math.floor((launch - (now ?? launch)) / 1000));
  const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
  return <>
    <aside aria-label="Function Hour launches October 19, 2026" className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pt-4">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-violet-200 bg-white px-4 py-2 shadow-sm">
        <span aria-hidden="true" className="fh-launch-spark text-lg text-violet-700">✦</span>
        <p className="text-xs font-bold text-violet-900">{launched ? "We’re live! Find your Function." : "The countdown is on · Oct 19"}</p>
        {!launched && <div aria-hidden="true" className="flex gap-2">{values.map((value,index) => <span key={index} className="text-center"><span className="block min-w-7 font-mono text-sm font-bold tabular-nums text-zinc-950">{now === null ? "—" : String(value).padStart(2,"0")}</span><span className="block text-[9px] font-bold uppercase text-zinc-600">{["days","hrs","min","sec"][index]}</span></span>)}</div>}
        <span className="sr-only">{launched ? "Function Hour has launched." : "Launches October 19 at midnight Central Time."}</span>
      </div>
    </aside>
    {celebrate && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">{Array.from({length:32},(_,index) => <i key={index} className="fh-launch-confetti absolute -top-5 h-3 w-2 rounded-sm" style={{ left:`${(index * 37) % 100}%`, background:index % 2 ? "#f97316" : "#7c3aed", animationDelay:`${(index % 7) * .16}s`, "--confetti-drift":`${(index % 5 - 2) * 30}px` } as CSSProperties} />)}</div>}
  </>;
}
