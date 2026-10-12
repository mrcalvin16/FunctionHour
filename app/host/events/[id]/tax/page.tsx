"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function OrganizerTaxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(api.events.getById, { eventId: id as Id<"events"> });
  const access = useQuery(api.eventAccess.getMyEventAccess, { eventId: id as Id<"events"> });
  const [zip, setZip] = useState("");
  const [rate, setRate] = useState("");
  const [basis, setBasis] = useState("");
  const [taxAddOns, setTaxAddOns] = useState(false);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/host/ticket-tax", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: id, venuePostalCode: zip.trim(), percentage: Number(rate),
          basis: basis.trim(), taxAddOns, registeredAndWillRemit: attested }),
      });
      const data = await response.json();
      setMessage(response.ok ? "Tax setting saved. The organizer tax will be included in your event proceeds for remittance." : data.error || "Could not save tax settings.");
    } catch { setMessage("Could not reach the tax settings service."); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/host/ticket-tax", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: id }),
      });
      const data = await response.json();
      setMessage(response.ok ? "Organizer tax removed from future checkouts. Review whether you still owe tax." : data.error || "Could not remove tax.");
    } catch { setMessage("Could not reach the tax settings service."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-950">
    <Link href={`/host/events/${id}/tickets`} className="font-semibold text-violet-800">← Tickets</Link>
    <h1 className="mt-5 text-3xl font-black">Organizer tax settings</h1>
    <p className="mt-3 text-zinc-700">Function Hour collects tax when its own rules require it. Elsewhere, you can add tax to admission at the event venue. Organizer-collected tax is included in your event proceeds, and you are responsible for registration, filing, and remittance.</p>
    {event === undefined || access === undefined ? <p className="mt-6">Loading event…</p> : !event || access.role !== "owner" ?
      <p className="mt-6" role="alert">Only the event owner can change tax settings.</p> :
      event.taxPolicy && event.taxPolicy.collector !== "organizer" ?
        <p className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">Function Hour handles tax collection for this event. Organizer settings are unavailable.</p> :
      <form onSubmit={save} className="mt-6 space-y-5 rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold">Venue: {[event.venueName, event.venueAddress, event.city, event.state].filter(Boolean).join(", ")}</p>
        <label className="block font-semibold">Venue ZIP<input required inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" value={zip} onChange={e => setZip(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
        <label className="block font-semibold">Admission tax rate (%)<input required type="number" min="0" max="25" step="0.001" value={rate} onChange={e => setRate(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
        <label className="block font-semibold">Tax basis and registration jurisdiction<textarea required minLength={10} maxLength={500} value={basis} onChange={e => setBasis(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-zinc-400 p-3" /><span className="mt-1 block text-sm font-normal text-zinc-700">Describe the applicable jurisdiction. Do not enter a tax ID or other private identifier.</span></label>
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={taxAddOns} onChange={e => setTaxAddOns(e.target.checked)} />Apply the same rate to paid add-ons (only if their tax treatment matches admission).</label>
        <p className="text-sm text-zinc-700">This rate does not apply to the Function Hour service fee. Set add-on treatment separately when goods or services have different rules.</p>
        <label className="flex gap-3 text-sm"><input type="checkbox" required checked={attested} onChange={e => setAttested(e.target.checked)} />I am authorized to collect this tax, have any required registrations, and will file and remit organizer-collected tax.</label>
        <button disabled={busy} className="rounded-xl bg-violet-700 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Saving…" : "Save organizer tax"}</button>
        {event.taxPolicy?.collector === "organizer" && <button type="button" disabled={busy} onClick={remove} className="ml-3 rounded-xl border border-zinc-500 px-5 py-3 font-semibold text-zinc-900 disabled:opacity-60">Stop adding organizer tax</button>}
        {message && <p role="status" className="font-semibold">{message}</p>}
      </form>}
  </main>;
}
