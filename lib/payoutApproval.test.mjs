import assert from "node:assert/strict";
import test from "node:test";
import { payoutApprovalBlockReason } from "./payoutApproval.ts";

const ready = {
  requestedCents: 10000, availableCents: 15000, remainingLedgerCents: 12000,
  pendingCents: 10000, accountReady: true, openDisputes: 0,
};

test("review blocks refunds, disputes, unavailable balance and changed requests", () => {
  assert.equal(payoutApprovalBlockReason(ready), null);
  assert.match(payoutApprovalBlockReason({ ...ready, remainingLedgerCents: 9000 }), /ledger/);
  assert.match(payoutApprovalBlockReason({ ...ready, openDisputes: 1 }), /disputes/);
  assert.match(payoutApprovalBlockReason({ ...ready, availableCents: 9000 }), /Stripe/);
  assert.match(payoutApprovalBlockReason({ ...ready, pendingCents: null }), /pending/);
  assert.match(payoutApprovalBlockReason({ ...ready, accountReady: false }), /account/);
});
