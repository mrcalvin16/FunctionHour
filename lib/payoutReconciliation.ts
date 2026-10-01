export function transferMatchesPayout(
  transfer: {
    destination: string | { id: string } | null;
    amount: number;
    amount_reversed: number;
    currency: string;
    livemode: boolean;
    metadata: Record<string, string>;
  },
  payout: { requestId: string; stripeAccountId: string; amount: number; currency: string },
) {
  const destination = typeof transfer.destination === "string"
    ? transfer.destination : transfer.destination?.id;
  return transfer.livemode && destination === payout.stripeAccountId &&
    transfer.amount === Math.round(payout.amount * 100) &&
    transfer.amount_reversed === 0 && transfer.currency === payout.currency &&
    transfer.metadata?.payoutRequestId === payout.requestId;
}
