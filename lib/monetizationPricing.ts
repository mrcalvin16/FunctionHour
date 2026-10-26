/**
 * FunctionHour pricing policy draft. NOT wired to checkout or live demand telemetry.
 * Prices are integer cents; server must persist and verify accepted quotes.
 */
export const MERCH_COMMISSION_BPS = 500; // 5% of merchandise subtotal, excluding taxes/shipping
export const BOOST_MIN_CENTS = 500;
export const BOOST_MAX_CENTS = 50000;
export const BOOST_QUOTE_TTL_MS = 15 * 60 * 1000;
export type BoostPlacement = "discovery" | "featured" | "spotlight";
export type BoostSignals = {
  areaDemandIndex: number; // 0..1, measured from local searches/impressions
  competingBoosts: number; // count of active competing placements
  availableSlots: number; // inventory in requested geography
  daysUntilEvent: number;
  durationDays: number;
  placement: BoostPlacement;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finite = (v: number) => Number.isFinite(v);
export function merchCommissionCents(subtotalCents: number): number {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) throw new Error("Invalid merchandise subtotal");
  return Math.round(subtotalCents * MERCH_COMMISSION_BPS / 10000);
}
export function quoteBoostCents(s: BoostSignals): { totalCents: number; multiplier: number; factors: Record<string, number> } {
  if (![s.areaDemandIndex,s.competingBoosts,s.availableSlots,s.daysUntilEvent,s.durationDays].every(finite) ||
    s.areaDemandIndex < 0 || s.areaDemandIndex > 1 ||
    !Number.isInteger(s.competingBoosts) || s.competingBoosts < 0 ||
    !Number.isInteger(s.availableSlots) || s.availableSlots < 1 ||
    !Number.isInteger(s.daysUntilEvent) || s.daysUntilEvent < 0 ||
    (s.durationDays > 0.5 && !Number.isInteger(s.durationDays)) || s.durationDays < 1 / 24 || s.durationDays > 30 ||
    !["discovery","featured","spotlight"].includes(s.placement)) throw new Error("Invalid boost signals");
  const basePerDay = { discovery: 250, featured: 500, spotlight: 850 }[s.placement];
  const demand = 0.8 + s.areaDemandIndex * 1.2;
  const competition = clamp(1 + (s.competingBoosts / s.availableSlots) * 0.15, 1, 1.6);
  const urgency = s.daysUntilEvent <= 3 ? 1.2 : s.daysUntilEvent <= 7 ? 1.1 : 1;
  const durationDiscount = s.durationDays >= 14 ? 0.8 : s.durationDays >= 7 ? 0.9 : 1;
  const multiplier = demand * competition * urgency * durationDiscount;
  // Last-minute prices are proportional to the available hours (minimum $1).
  const minimumCents = s.durationDays <= 0.5 ? 100 : BOOST_MIN_CENTS;
  const totalCents = clamp(Math.round(basePerDay * s.durationDays * multiplier), minimumCents, BOOST_MAX_CENTS);
  return { totalCents, multiplier: Math.round(multiplier*100)/100,
    factors: { demand, competition, urgency, durationDiscount } };
}
