/**
 * Aggregate, non-personal market metrics for FunctionHour boost quotes.
 * Server-side use only. Never derive price from protected traits or client-provided demand.
 */
export type AreaActivity = {
  eligibleEventViews7d: number;
  eligibleEventClicks7d: number;
  activeCompetingBoosts: number;
  availablePlacementSlots: number;
};
const validCount = (v: number) => Number.isSafeInteger(v) && v >= 0;
export function deriveAreaDemand(input: AreaActivity): {
  areaDemandIndex: number;
  competingBoosts: number;
  availableSlots: number;
  signalQuality: "observed" | "insufficient_data";
} {
  if (!Object.values(input).every(validCount) || input.availablePlacementSlots === 0)
    throw new Error("Invalid area activity or no placement inventory");
  // Conservative neutral fallback until enough local observations exist.
  const enoughData = input.eligibleEventViews7d >= 100;
  const clickRate = input.eligibleEventViews7d === 0 ? 0 :
    Math.min(1, input.eligibleEventClicks7d / input.eligibleEventViews7d);
  const areaDemandIndex = enoughData
    ? Math.round(Math.min(1, Math.max(0, clickRate / 0.15)) * 100) / 100
    : 0.5;
  return {
    areaDemandIndex,
    competingBoosts: input.activeCompetingBoosts,
    availableSlots: input.availablePlacementSlots,
    signalQuality: enoughData ? "observed" : "insufficient_data",
  };
}
