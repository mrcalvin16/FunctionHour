"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Category = "scan_failed" | "pass_missing" | "duplicate" | "offline" | "other";
const categories: Record<Category, string> = {
  scan_failed: "QR won't scan", pass_missing: "Pass or phone missing",
  duplicate: "Already checked in", offline: "Connection problem", other: "Other gate issue",
};

export default function GateIssuePanel({ eventId }: { eventId: Id<"events"> }) {
  const issues = useQuery(api.gateIssues.list, { eventId });
  const report = useMutation(api.gateIssues.report);
  const resolve = useMutation(api.gateIssues.resolve);
  const [category, setCategory] = useState<Category>("scan_failed");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function submit() {
    setBusy(true); setFeedback("");
    try { await report({ eventId, category, note }); setNote(""); setFeedback("Issue logged for this event."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Could not log issue."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-3xl border border-violet-300/25 bg-[#151024] p-5 text-white sm:p-7">
    <h2 className="text-xl font-black">Need help at the gate?</h2>
    <p className="mt-2 text-sm leading-6 text-zinc-200">Search the guest list by name or email if the phone or QR is missing. Check identity and ticket status before using Search check-in. A duplicate or refunded pass must be reviewed by a lead. Offline scans stay queued until they sync. Logging an issue never admits a guest.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_2fr_auto] sm:items-end">
      <label className="text-sm font-semibold">Issue type<select className="mt-1 block w-full rounded-xl bg-white p-3 text-zinc-950" value={category} onChange={(e) => setCategory(e.target.value as Category)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold">What happened? (no payment details)<input className="mt-1 block w-full rounded-xl bg-white p-3 text-zinc-950" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Gate, guest reference, and next step" /></label>
      <button type="button" onClick={submit} disabled={busy || note.trim().length < 8} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">Log issue</button>
    </div>
    {feedback && <p role="status" className="mt-3 text-sm text-violet-100">{feedback}</p>}
    <div className="mt-5 space-y-2">{issues?.filter((issue) => issue.status === "open").slice(0, 10).map((issue) => <div key={issue._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-sm"><div className="min-w-0"><strong>{categories[issue.category]}</strong><p className="break-words text-zinc-200">{issue.note}</p></div><button type="button" className="rounded-lg border border-white/40 px-3 py-2 font-bold" onClick={() => resolve({ issueId: issue._id }).catch(() => setFeedback("Could not resolve issue."))}>Mark resolved</button></div>)}</div>
  </section>;
}
