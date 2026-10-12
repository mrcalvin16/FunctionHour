export type TicketTaxPolicy = {
  mode: "collect" | "exempt";
  collector?: "platform" | "organizer";
  taxRateId?: string;
  serviceFeeTaxRateId?: string;
  addOnTaxRateId?: string;
  ratePercentage?: number;
  venuePostalCode: string;
  locationKey: string;
  reason: string;
  reviewedBy: string;
  reviewedAt: number;
};

// A tax review belongs to the venue, not the buyer's billing address. If the
// host moves the event, the previous review is no longer valid.
export function eventTaxLocationKey(event: {
  venueAddress?: string;
  city?: string;
  state?: string;
}): string {
  return [event.venueAddress, event.city, event.state]
    .map((part) => (part ?? "").trim().replace(/\s+/g, " ").toLowerCase())
    .join("|");
}

export function isEventTaxReviewCurrent(
  event: { venueAddress?: string; city?: string; state?: string; taxPolicy?: TicketTaxPolicy },
): boolean {
  const policy = event.taxPolicy;
  return Boolean(policy && event.venueAddress?.trim() && event.city?.trim() && event.state?.trim() &&
    /^\d{5}(?:-\d{4})?$/.test(policy.venuePostalCode) &&
    policy.locationKey === eventTaxLocationKey(event) &&
    (policy.mode === "exempt" ? Boolean(policy.reason.trim()) :
      Boolean(policy.taxRateId && policy.ratePercentage !== undefined && policy.ratePercentage >= 0)));
}

export function estimateTicketTaxCents(taxableCents: number, percentage: number): number {
  return Math.round(taxableCents * percentage / 100);
}

export function organizerTicketProceeds(order: {
  grossAmount: number; platformFeeAmount?: number; taxAmount?: number;
  taxCollector?: "platform" | "organizer" | "none";
  refundedAmount: number;
}): number {
  const platformTax = order.taxCollector === "organizer" ? 0 : (order.taxAmount ?? 0);
  const proceeds = Math.max(0, order.grossAmount - (order.platformFeeAmount ?? 0) - platformTax);
  // Stripe's aggregate refunded amount does not tell us which lines or taxes
  // were refunded. Withhold the full refund from proceeds until reconciliation
  // rather than overpaying an organizer based on a guessed tax allocation.
  return Math.max(0, proceeds - Math.min(proceeds, order.refundedAmount));
}
