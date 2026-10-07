"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEventCommandCenter } from "./EventCommandCenter";

export default function PostEventWorkspace() {
  const { event, capabilities } = useEventCommandCenter();
  const canReport = capabilities.includes("view_reports");
  const canMarket = capabilities.includes("manage_marketing");
  const snapshot = useQuery(api.postEvent.getRetentionSnapshot, canReport ? { eventId: event._id } : "skip");
  const saveMessage = useMutation(api.eventMessages.saveMessage);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  if (!canReport) return null;
  async function publish() {
    setBusy(true); setFeedback("");
    try {
      await saveMessage({ eventId: event._id, channel: "event_page", audience: "all", subject: `Thank you for joining ${event.name}`, body: note, publish: true });
      setNote(""); setFeedback("Recap published on the event page. Attendees can see it when they revisit the event.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to publish recap."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-[1.75rem] border border-white/10 bg-[#151024] p-5 text-white sm:p-7">
    <p className="text-xs font-black uppercase tracking-widest text-orange-300">After the event</p>
    <h3 className="mt-2 text-2xl font-black">Bring guests back</h3>
    <p className="mt-2 text-sm leading-6 text-zinc-200">See who attended, share a recap, and invite them to follow your organizer profile for future events.</p>
    {snapshot && <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Active tickets",snapshot.ticketCount],["Checked-in guests",snapshot.checkedInCount],[`Returning in sample of ${snapshot.returnSampleSize}`,snapshot.returningAttendees]].map(([label, count]) => <div key={label} className="rounded-xl border border-white/15 bg-white/5 p-4"><p className="text-xs font-bold text-zinc-200">{label}</p><p className="mt-1 text-2xl font-black">{count}</p></div>)}</div>}
    {snapshot?.limited && <p className="mt-3 text-sm text-amber-200">Snapshot is limited to the first 500 tickets and 75 attendee histories; returning count is a sample, not a full total.</p>}
    {canMarket && snapshot?.eventEnded && <div className="mt-5"><label className="block text-sm font-bold">Public event recap<textarea className="mt-2 block w-full rounded-xl bg-white p-3 text-zinc-950" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thank guests and point them to your next event or organizer profile." /></label><button disabled={busy || !note.trim()} onClick={publish} className="mt-3 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">Publish recap</button><p className="mt-2 text-xs text-zinc-200">This is a public event-page post. Email campaigns remain drafts until consent and delivery are configured.</p></div>}
    <Link href={`/events/${event._id}`} className="mt-5 inline-block text-sm font-bold text-violet-200 underline">View public event page</Link>
    {feedback && <p role="status" className="mt-3 text-sm text-violet-100">{feedback}</p>}
  </section>;
}
