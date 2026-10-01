export function payoutApprovalBlockReason(input: {
  requestedCents: number;
  availableCents: number;
  remainingLedgerCents: number;
  pendingCents: number | null;
  accountReady: boolean;
  openDisputes: number;
}) {
  if (!input.accountReady) return "Connected payout account is not ready.";
  if (input.openDisputes > 0) return "Open disputes require reconciliation.";
  if (input.requestedCents <= 0 || input.pendingCents !== input.requestedCents) {
    return "Payout request is no longer pending.";
  }
  if (input.remainingLedgerCents < input.requestedCents) return "Organizer ledger changed.";
  if (input.availableCents < input.requestedCents) return "Stripe funds are not yet available.";
  return null;
}
