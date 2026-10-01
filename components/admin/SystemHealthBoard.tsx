"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Check = { id: string; title: string; state: "healthy" | "attention" | "unavailable" | "unverified"; detail: string; href?: string };
type Snapshot = { checkedAt: string; version: string; checks: Check[] };

const colors = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attention: "border-amber-300 bg-amber-50 text-amber-950",
  unavailable: "border-rose-200 bg-rose-50 text-rose-950",
  unverified: "border-zinc-300 bg-zinc-100 text-zinc-900",
};

export default function SystemHealthBoard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/system-health", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load system checks. Try again shortly.");
      setSnapshot(await response.json()); setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load system checks.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <section className="mt-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">Current checks</h2>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="min-h-11 rounded-xl border border-zinc-400 bg-white px-5 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60">{loading ? "Checking…" : "Run checks again"}</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-950">{error}</p>}
    {snapshot && <>
      <p className="mt-3 text-sm text-zinc-700">Checked {new Date(snapshot.checkedAt).toLocaleString()} · deployment {snapshot.version}. Counts use recent bounded samples; refresh for a new snapshot.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {snapshot.checks.map((check) => <article key={check.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold capitalize ${colors[check.state]}`}>{check.state}</span>
          <h3 className="mt-3 text-lg font-semibold text-zinc-950">{check.title}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-700">{check.detail}</p>
          {check.href && <Link href={check.href} className="mt-4 inline-block text-sm font-semibold text-violet-700 underline underline-offset-4">Investigate →</Link>}
        </article>)}
      </div>
    </>}
    {!snapshot && !error && <p className="mt-4" role="status">Checking services…</p>}
  </section>;
}
