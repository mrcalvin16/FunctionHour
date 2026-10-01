import { test } from "node:test";
import { strict as assert } from "node:assert";
import { transferMatchesPayout } from "./payoutReconciliation.ts";

const payout = { requestId: "request_123", stripeAccountId: "acct_123", amount: 42.50, currency: "usd" };
const transfer = {
  destination: "acct_123", amount: 4250, amount_reversed: 0, currency: "usd", livemode: true,
  metadata: { payoutRequestId: "request_123" },
};

test("a live, unreversed transfer must match the exact payout request", () => {
  assert.equal(transferMatchesPayout(transfer, payout), true);
  for (const change of [
    { destination: "acct_other" }, { amount: 4300 }, { amount_reversed: 100 },
    { currency: "eur" }, { livemode: false }, { metadata: { payoutRequestId: "request_other" } },
  ]) assert.equal(transferMatchesPayout({ ...transfer, ...change }, payout), false);
});
