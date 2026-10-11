"use client";

import { useState } from "react";
import { useReverification } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { api } from "@/convex/_generated/api";

export default function SecureEventExports() {
  const events = useQuery(api.events.getMyEvents, {});
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = events?.find(event => event._id === eventId) ?? events?.find(event => !event.isDemo);
  const exportVerified = useReverification(async (type: "attendees" | "statement") => {
    const response = await fetch("/api/host/export", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: selected?._id, type }),
    });
    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      // Clerk returns this hint for step-up verification. It must reach
      // useReverification so the sign-in prompt can open and retry the request.
      if (body.clerk_error?.reason === "reverification-error") return body;
      throw new Error(body.error || "You do not have access to this export.");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Export could not be created.");
    }
    return response.blob();
  });
  async function download(type: "attendees" | "statement") {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try {
      const result = await exportVerified(type);
      if (!(result instanceof Blob)) return;
      const url = URL.createObjectURL(result);
      const link = document.createElement("a");
      link.href = url;
      link.download = `functionhour-${type}-${selected._id}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Verification was cancelled.");
    }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-white/15 bg-white/5 p-5 text-white">
    <h2 className="text-lg font-bold">Private event exports</h2>
    <p className="mt-2 text-sm text-zinc-200">Confirm your account sign-in before downloading guest details or ticket sales. Only the event owner can export these files.</p>
    <label className="mt-4 block text-sm font-semibold" htmlFor="export-event">Event</label>
    <select id="export-event" value={selected?._id ?? ""} onChange={e => setEventId(e.target.value)}
      className="mt-2 w-full rounded-lg bg-white p-3 text-slate-950" disabled={!events?.length}>
      {(events ?? []).filter(event => !event.isDemo).map(event =>
        <option key={event._id} value={event._id}>{event.name}</option>)}
    </select>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={!selected || busy} onClick={() => download("attendees")}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Download size={16}/> Attendee list CSV</button>
      <button type="button" disabled={!selected || busy} onClick={() => download("statement")}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Download size={16}/> Ticket sales statement CSV</button>
    </div>
    <p className="mt-3 text-xs text-zinc-300">Sales statement shows ticket orders recorded in Function Hour. It is not a tax form or Stripe payout statement.</p>
    {error && <p role="alert" className="mt-3 text-sm text-rose-200">{error}</p>}
  </section>;
}
