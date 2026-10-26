import { BOOST_QUOTE_TTL_MS, quoteBoostCents, type BoostPlacement, type BoostSignals } from "./monetizationPricing";

export const BOOST_QUOTE_VERSION = "boost-v1";
export type BoostQuote = {
  eventId: string;
  organizerId: string;
  areaKey: string;
  placement: BoostPlacement;
  durationDays: number;
  currency: "usd";
  totalCents: number;
  calculatedAt: number;
  expiresAt: number;
  pricingVersion: typeof BOOST_QUOTE_VERSION;
  marketSnapshot: Pick<BoostSignals, "areaDemandIndex" | "competingBoosts" | "availableSlots" | "daysUntilEvent">;
};
/**
 * Server-only quote builder. The caller MUST authenticate and authorize the event,
 * derive market signals from trusted backend data, and persist the quote before checkout.
 * This module deliberately cannot create a Stripe charge.
 */
export function buildBoostQuote(input: {
  eventId: string;
  organizerId: string;
  areaKey: string;
  placement: BoostPlacement;
  durationDays: number;
  market: Pick<BoostSignals, "areaDemandIndex" | "competingBoosts" | "availableSlots" | "daysUntilEvent">;
  now: number;
}): BoostQuote {
  if (!input.eventId.trim() || !input.organizerId.trim() || !input.areaKey.trim()) throw new Error("Missing quote ownership or area");
  if (!Number.isSafeInteger(input.now) || input.now < 0) throw new Error("Invalid quote timestamp");
  const totalCents = quoteBoostCents({ ...input.market, placement: input.placement, durationDays: input.durationDays }).totalCents;
  return {
    eventId: input.eventId,
    organizerId: input.organizerId,
    areaKey: input.areaKey,
    placement: input.placement,
    durationDays: input.durationDays,
    currency: "usd",
    totalCents,
    calculatedAt: input.now,
    expiresAt: input.now + BOOST_QUOTE_TTL_MS,
    pricingVersion: BOOST_QUOTE_VERSION,
    marketSnapshot: { ...input.market },
  };
}
/** Fail closed: checkout must compare persisted owner/event and amount, never accept a browser amount. */
export function assertBoostQuoteEligible(quote: BoostQuote, context: {
  eventId: string; organizerId: string; now: number; expectedTotalCents: number;
}): void {
  if (quote.eventId !== context.eventId || quote.organizerId !== context.organizerId) throw new Error("Quote ownership mismatch");
  if (!Number.isSafeInteger(context.now) || context.now < quote.calculatedAt || context.now >= quote.expiresAt) throw new Error("Quote expired");
  if (quote.currency !== "usd" || quote.pricingVersion !== BOOST_QUOTE_VERSION) throw new Error("Unsupported quote");
  if (!Number.isSafeInteger(context.expectedTotalCents) || context.expectedTotalCents !== quote.totalCents) throw new Error("Quote amount mismatch");
}
