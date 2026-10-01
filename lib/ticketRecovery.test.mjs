import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateTicketRecovery } from "./ticketRecovery.ts";

const paid = {
  sessionId: "cs_live_123", checkoutType: "ticket", sessionStatus: "complete",
  paymentStatus: "paid", livemode: true, paymentIntentStatus: "succeeded",
  chargeAmount: 282, refundedAmount: 0, expectedQuantity: 1,
  ticketCount: 0, orderRecorded: false,
};

test("recovery requires paid live checkout and an unrefunded charge", () => {
  for (const change of [
    { paymentStatus: "unpaid" }, { livemode: false }, { paymentIntentStatus: "requires_payment_method" },
    { refundedAmount: 282 }, { sessionStatus: "expired" }, { checkoutType: "merch" },
  ]) {
    assert.equal(evaluateTicketRecovery({ ...paid, ...change }).kind, "blocked");
  }
});

test("an already fulfilled purchase is a no-op and partial ticket counts require review", () => {
  assert.equal(evaluateTicketRecovery({ ...paid, orderRecorded: true, ticketCount: 1 }).kind, "already_fulfilled");
  assert.equal(evaluateTicketRecovery({ ...paid, orderRecorded: true, ticketCount: 1, expectedQuantity: 2 }).kind, "blocked");
  assert.equal(evaluateTicketRecovery({ ...paid, orderRecorded: true }).kind, "recoverable");
  assert.equal(evaluateTicketRecovery({ ...paid, ticketCount: 1 }).kind, "recoverable");
});
