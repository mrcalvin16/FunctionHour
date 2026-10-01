type RecoveryState = {
  sessionId: string;
  checkoutType?: string;
  sessionStatus: string | null;
  paymentStatus: string;
  livemode: boolean;
  paymentIntentStatus: string;
  chargeAmount: number;
  refundedAmount: number;
  expectedQuantity: number;
  ticketCount: number;
  orderRecorded: boolean;
};

export function evaluateTicketRecovery(state: RecoveryState):
  { kind: "blocked"; reason: string } | { kind: "already_fulfilled" } | { kind: "recoverable" } {
  if (state.checkoutType !== "ticket" || state.sessionStatus !== "complete" ||
      state.paymentStatus !== "paid" || !state.livemode || !state.sessionId.startsWith("cs_live_")) {
    return { kind: "blocked", reason: "Only completed live paid ticket sessions can be recovered." };
  }
  if (state.paymentIntentStatus !== "succeeded" || state.chargeAmount <= 0 ||
      state.refundedAmount >= state.chargeAmount) {
    return { kind: "blocked", reason: "Payment is not settled or was fully refunded. No tickets were issued." };
  }
  if (state.expectedQuantity < 1) {
    return { kind: "blocked", reason: "Checkout ticket selection is missing. Escalate for manual review." };
  }
  if (state.ticketCount > 0 && state.ticketCount !== state.expectedQuantity) {
    return { kind: "blocked", reason: "Ticket count differs from the purchase. Escalate for manual review." };
  }
  if (state.orderRecorded && state.ticketCount === state.expectedQuantity) {
    return { kind: "already_fulfilled" };
  }
  return { kind: "recoverable" };
}
