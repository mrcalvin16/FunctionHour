export const TICKET_PURCHASE_TERMS_VERSION = "2026-10-11";

export const DEFAULT_EVENT_REFUND_POLICY =
  "All sales are final unless otherwise stated by the event host or required by law.";

export const SERVICE_FEE_REFUND_POLICY =
  "A full refund returns the full amount paid, including the Function Hour service fee. A partial refund does not automatically return the service fee; the amount to be refunded is confirmed with the decision. Applicable law and the event policy may require a different outcome.";

export function eventRefundPolicyText(policy?: string | null): string {
  return policy?.trim() || DEFAULT_EVENT_REFUND_POLICY;
}
