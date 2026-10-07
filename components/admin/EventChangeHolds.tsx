"use client";

import { useCallback, useEffect, useState } from "react";

type Hold = { eventId: string; name: string; organizerId: string; status: string };

export default function EventChangeHolds() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/event-change-holds", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load event holds.");
    setHolds(result.holds);
  }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);
  async function clear(eventId: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/event-change-holds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, reviewNote: notes[eventId] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Review failed.");
      await load(); setMessage("Hold cleared. The review note is retained on the event.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review failed."); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 rounded-2xl border border-amber-300 bg-white p-5 text-zinc-950 shadow-sm">
    <h2 className="text-lg font-bold">Event change payout holds</h2>
    <p className="mt-2 text-sm text-zinc-700">Cancellation and postponement pause organizer payout requests and approvals. Review Stripe refunds, disputes, remaining liabilities, and attendee notices before releasing a hold. Clearing a hold does not reopen ticket sales.</p>
    {message && <p role="status" className="mt-3 text-sm font-semibold">{message}</p>}
    <div className="mt-4 space-y-4">{holds.map((hold) => <div key={hold.eventId} className="rounded-xl border border-zinc-200 p-4">
      <p className="font-bold">{hold.name} · {hold.status}</p><p className="text-xs text-zinc-700">Organizer: {hold.organizerId}</p>
      <label className="mt-3 block text-sm font-semibold">Reconciliation note<input className="mt-1 block w-full rounded-lg border border-zinc-400 p-3" value={notes[hold.eventId] || ""} onChange={(e) => setNotes({ ...notes, [hold.eventId]: e.target.value })} placeholder="Refunds reviewed, liabilities reconciled, notice status…" /></label>
      <button type="button" disabled={busy || (notes[hold.eventId]?.trim().length || 0) < 20} onClick={() => clear(hold.eventId)} className="mt-3 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Clear payout hold</button>
    </div>)}{holds.length === 0 && <p className="text-sm text-zinc-700">No open event-change holds in the recent event window.</p>}</div>
  </section>;
}
