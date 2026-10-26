"use client";

import { useMemo, useState } from "react";
import { quoteBoostCents, type BoostPlacement } from "@/lib/monetizationPricing";

type PreviewProps = {
  areaLabel: string;
  /** Aggregate server-derived market data, never trusted as payment authorization. */
  areaDemandIndex: number;
  competingBoosts: number;
  availableSlots: number;
  daysUntilEvent: number;
};
export default function BoostPricingPreview(props: PreviewProps) {
  const [placement, setPlacement] = useState<BoostPlacement>("featured");
  const [durationDays, setDurationDays] = useState(7);
  const quote = useMemo(() => {
    try {
      return quoteBoostCents({
        areaDemandIndex: props.areaDemandIndex,
        competingBoosts: props.competingBoosts,
        availableSlots: props.availableSlots,
        daysUntilEvent: props.daysUntilEvent,
        durationDays,
        placement,
      });
    } catch { return null; }
  }, [props.areaDemandIndex, props.competingBoosts, props.availableSlots, props.daysUntilEvent, durationDays, placement]);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 text-gray-950" aria-label="Boost price preview">
      <h2 className="text-xl font-semibold">Boost your event</h2>
      <p className="mt-1 text-sm text-gray-600">Flexible pricing varies by area demand, local competition, placement and duration.</p>
      <p className="mt-3 text-sm font-medium">Target area: {props.areaLabel}</p>
      <label className="mt-4 block text-sm font-medium" htmlFor="boost-placement">Placement</label>
      <select id="boost-placement" value={placement} onChange={(e) => setPlacement(e.target.value as BoostPlacement)} className="mt-1 w-full rounded-lg border p-2">
        <option value="discovery">Discovery</option><option value="featured">Featured</option><option value="spotlight">Spotlight</option>
      </select>
      <label className="mt-4 block text-sm font-medium" htmlFor="boost-duration">Duration</label>
      <select id="boost-duration" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2">
        <option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option>
      </select>
      {quote ? (
        <div className="mt-5">
          <p className="text-sm text-gray-600">Estimated total</p>
          <p className="text-3xl font-bold">${(quote.totalCents / 100).toFixed(2)}</p>
          <p className="mt-2 text-xs text-gray-600">Preview only. Final price is calculated and locked by FunctionHour before payment. Boosts do not guarantee ticket sales.</p>
        </div>
      ) : <p role="alert" className="mt-4 text-sm">Pricing is temporarily unavailable for this area.</p>}
    </section>
  );
}
