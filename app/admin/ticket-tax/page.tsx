"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function TicketTaxReviewPage() {
  const [eventId, setEventId] = useState("");
  const [venuePostalCode, setVenuePostalCode] = useState("");
  const [mode, setMode] = useState<"collect" | "exempt">("collect");
  const [taxRateId, setTaxRateId] = useState("");
  const [serviceFeeTaxRateId, setServiceFeeTaxRateId] = useState("");
  const [addOnTaxRateId, setAddOnTaxRateId] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/admin/ticket-tax", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventId.trim(), venuePostalCode: venuePostalCode.trim(),
          mode, taxRateId: mode === "collect" ? taxRateId.trim() : undefined,
          serviceFeeTaxRateId: mode === "collect" && serviceFeeTaxRateId.trim() ? serviceFeeTaxRateId.trim() : undefined,
          addOnTaxRateId: mode === "collect" && addOnTaxRateId.trim() ? addOnTaxRateId.trim() : undefined,
          reason: reason.trim() }),
      });
      const data = await response.json();
      setResult(response.ok ? "Tax review saved. Paid checkout can use this venue policy." : (data.error || "Review failed."));
    } catch { setResult("Could not reach the review service."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-950">
    <Link href="/admin/finance" className="text-sm font-semibold text-violet-800">← Finance</Link>
    <h1 className="mt-4 text-3xl font-bold">Ticket tax review</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-700">Review each in-person event venue with your tax adviser before enabling paid checkout. Enter a verified exclusive Stripe tax rate for admission. Enter a separate service fee rate when that fee is taxable. Paid add-ons require their own reviewed rate. Document untaxed fee treatment or exemptions in the basis. This setting does not file or remit taxes.</p>
    <form onSubmit={save} className="mt-6 space-y-5 rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm">
      <label className="block text-sm font-semibold">Event ID<input required value={eventId} onChange={e => setEventId(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
      <label className="block text-sm font-semibold">Venue ZIP<input required inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" value={venuePostalCode} onChange={e => setVenuePostalCode(e.target.value)} className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
      <label className="block text-sm font-semibold">Review outcome<select value={mode} onChange={e => setMode(e.target.value as "collect" | "exempt")} className="mt-2 w-full rounded-lg border border-zinc-400 bg-white p-3"><option value="collect">Collect tax</option><option value="exempt">Reviewed exemption / no collection</option></select></label>
      {mode === "collect" && <>
        <label className="block text-sm font-semibold">Stripe admission tax rate ID<input required value={taxRateId} onChange={e => setTaxRateId(e.target.value)} placeholder="txr_..." className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
        <label className="block text-sm font-semibold">Stripe service fee tax rate ID, if taxable<input value={serviceFeeTaxRateId} onChange={e => setServiceFeeTaxRateId(e.target.value)} placeholder="txr_..." className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
        <label className="block text-sm font-semibold">Stripe add-on tax rate ID, if selling paid add-ons<input value={addOnTaxRateId} onChange={e => setAddOnTaxRateId(e.target.value)} placeholder="txr_..." className="mt-2 w-full rounded-lg border border-zinc-400 p-3" /></label>
      </>}
      <label className="block text-sm font-semibold">Basis for rate or exemption<textarea required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-zinc-400 p-3" /></label>
      <button disabled={busy} className="rounded-xl bg-violet-700 px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Saving…" : "Save reviewed policy"}</button>
      {result && <p role="status" className="text-sm font-semibold">{result}</p>}
    </form>
  </main>;
}
