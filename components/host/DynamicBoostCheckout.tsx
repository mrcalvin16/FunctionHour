"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { BoostPlacement } from "@/lib/monetizationPricing";

type ServerQuote = { quoteId: Id<"boostQuotes">; totalCents: number; expiresAt: number;
  currency: "usd"; signalQuality: "observed" | "insufficient_data"; checkoutEnabled: boolean };
export default function DynamicBoostCheckout({ eventId }: { eventId: Id<"events"> }) {
  const createQuote = useMutation(api.boostQuotes.createPreviewQuote);
  const [placement, setPlacement] = useState<BoostPlacement>("featured");
  const [durationDays, setDurationDays] = useState(7);
  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestQuote = async () => {
    setLoading(true); setError(""); setQuote(null);
    try {
      const next = await createQuote({ eventId, placement, durationDays });
      setQuote(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not calculate a price."); }
    finally { setLoading(false); }
  };
  const checkout = async () => {
    if (!quote || Date.now() >= quote.expiresAt) { setError("Quote expired. Request a new price."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/boost/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout unavailable");
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed."); setLoading(false); }
  };
  return <section className="rounded-3xl border border-zinc-200 bg-white p-6 text-zinc-950">
    <h2 className="text-2xl font-black">Flexible boost pricing</h2>
    <p className="mt-2 text-sm text-zinc-600">Your rate reflects local demand, active competition, placement, and duration. Final pricing is confirmed before payment.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Placement
        <select value={placement} onChange={e => { setPlacement(e.target.value as BoostPlacement); setQuote(null); }}
          className="mt-2 block w-full rounded-xl border border-zinc-300 p-3">
          <option value="discovery">Discovery</option><option value="featured">Featured</option><option value="spotlight">Spotlight</option>
        </select>
      </label>
      <label className="text-sm font-semibold">Duration
        <select value={durationDays} onChange={e => { setDurationDays(Number(e.target.value)); setQuote(null); }}
          className="mt-2 block w-full rounded-xl border border-zinc-300 p-3">
          <option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option>
        </select>
      </label>
    </div>
    <button type="button" disabled={loading} onClick={requestQuote}
      className="mt-5 min-h-12 rounded-xl bg-violet-700 px-6 font-bold text-white disabled:opacity-50">
      {loading ? "Please wait…" : "Get my final price"}
    </button>
    {quote && <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-sm text-zinc-600">Your quoted total</p>
      <p className="mt-1 text-4xl font-black">${(quote.totalCents / 100).toFixed(2)}</p>
      <p className="mt-2 text-xs text-zinc-600">Valid for 15 minutes from issue. {quote.signalQuality === "insufficient_data" ? "Limited local activity data; a neutral demand estimate was used." : "Based on recent local event activity."} Boosts do not guarantee ticket sales.</p>
      <button type="button" onClick={checkout} disabled={loading || !quote.checkoutEnabled}
        className="mt-4 min-h-12 rounded-xl bg-violet-700 px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {quote.checkoutEnabled ? "Approve price and pay securely" : "Payment activation pending"}
      </button>
    </div>}
    {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
  </section>;
}
