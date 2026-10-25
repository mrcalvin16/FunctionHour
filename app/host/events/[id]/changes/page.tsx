"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEventCommandCenter } from "@/components/host/events/command-center/EventCommandCenter";

function toLocalDateTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type ChangeKind = "cancelled" | "postponed" | "rescheduled" | "venue_changed";
const labels: Record<ChangeKind, string> = {
  cancelled: "Cancel event", postponed: "Postpone event", rescheduled: "Change event date / time", venue_changed: "Change venue",
};

export default function EventChangesPage() {
  const { event, capabilities } = useEventCommandCenter();
  const canManage = capabilities.includes("manage_event");
  const changes = useQuery(api.eventOperations.getChanges, canManage ? { eventId: event._id } : "skip");
  const changeEvent = useMutation(api.eventOperations.changeEvent);
  const [kind, setKind] = useState<ChangeKind>("rescheduled");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(() => toLocalDateTime(event.eventDate));
  const [endDate, setEndDate] = useState(() => toLocalDateTime(event.endDate));
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  if (!canManage) return <p className="p-8 text-zinc-900">Event management access required.</p>;
  async function save() {
    if (confirmation !== event.name) return setFeedback("Type the event name exactly to confirm this change.");
    if (kind === "rescheduled") {
      const start = new Date(date).getTime();
      const end = endDate ? new Date(endDate).getTime() : undefined;
      if (!date || !Number.isFinite(start) || (endDate && !Number.isFinite(end!))) {
        return setFeedback("Enter a valid start and end date/time.");
      }
      if (end !== undefined && end <= start) {
        return setFeedback("End time must be after start time.");
      }
    }
    setBusy(true); setFeedback("");
    try {
      await changeEvent({
        eventId: event._id, kind, message,
        ...(kind === "rescheduled" && {
          nextDate: new Date(date).getTime(), nextDateString: date,
          nextEndDateString: endDate,
          ...(endDate && { nextEndDate: new Date(endDate).getTime() }),
        }),
        ...(kind === "venue_changed" && { nextVenue: venue, nextVenueAddress: address, nextCity: city, nextState: state }),
      });
      setConfirmation(""); setMessage("");
      setFeedback("Event updated. The buyer notice list is being prepared. Send all pending notices below.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to update event."); }
    finally { setBusy(false); }
  }
  async function send(changeId: string) {
    setBusy(true); setFeedback("");
    try {
      const response = await fetch(`/api/events/${event._id}/change-notices`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send notices.");
      setFeedback(`${result.sent} notice(s) sent in this batch. ${result.totalSent} of ${result.queued} accepted by the email provider. Continue until all have been sent.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to send notices."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6 p-4 pb-12 text-zinc-950 sm:p-8">
    <div><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-700">Event operations</p><h2 className="mt-2 text-3xl font-black">Event changes</h2><p className="mt-3 text-sm leading-6 text-zinc-600">Record a cancellation, postponement, new date, or venue change. Ticket sales pause while an event is cancelled or postponed. Send every buyer notice below; the list includes paid and complimentary ticket holders. Refunds require separate Operations review in Stripe.</p></div>
    <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm p-5 sm:p-7">
      <label className="block text-sm font-bold">What changed?<select className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" value={kind} onChange={(e) => setKind(e.target.value as ChangeKind)}>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      {kind === "rescheduled" && (
        <fieldset className="mt-4 rounded-2xl border border-zinc-300 bg-zinc-50 p-4 sm:p-5">
          <legend className="px-2 text-base font-bold">Event schedule</legend>
          <p className="mb-4 text-sm text-zinc-600">Set the start and end together. Both times appear on the event page and attendee tickets.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">Starts
              <input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
            </label>
            <label className="block text-sm font-bold">Ends (optional)
              <input type="datetime-local" min={date || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
            </label>
          </div>
          <p className="mt-3 text-xs text-zinc-600">Times use your device timezone. Leave Ends blank to remove an existing end time. Confirm the change below, then send the queued notices to ticket holders.</p>
        </fieldset>
      )}
      {kind === "venue_changed" && <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">New venue name<input value={venue} onChange={(e) => setVenue(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></label><label className="text-sm font-bold">Street address<input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></label><label className="text-sm font-bold">City<input value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></label><label className="text-sm font-bold">State<input value={state} onChange={(e) => setState(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></label></div>}
      <label className="mt-4 block text-sm font-bold">Message to attendees<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1500} placeholder="Explain what happened, what attendees should do next, and where to ask about refunds." className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></label>
      <label className="mt-4 block text-sm font-bold">Type “{event.name}” to confirm<input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 text-zinc-950 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></label>
      <button onClick={save} disabled={busy || confirmation !== event.name || message.trim().length < 15} className="mt-5 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-100 disabled:text-orange-900/60">Record change</button>
    </div>
    {feedback && <p role="status" className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">{feedback}</p>}
    <section><h3 className="text-xl font-bold">Buyer notices</h3><p className="mt-2 text-sm text-zinc-600">Email delivery is batched so a failed request can be retried. Keep sending until each change shows all notices sent.</p><div className="mt-4 space-y-3">{changes?.map((change) => <article key={change._id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="font-bold">{labels[change.kind]} · {new Date(change.createdAt).toLocaleString()}</p><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600">{change.message}</p><p className="mt-3 text-xs text-zinc-600">{change.queueComplete ? `${change.sentCount} of ${change.queuedCount} notices sent` : "Preparing buyer list…"}</p>{change.queueComplete && change.sentCount < change.queuedCount && <button disabled={busy} onClick={() => send(change._id)} className="mt-3 rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send next 10 notices</button>}</article>)}</div></section>
  </div>;
}
