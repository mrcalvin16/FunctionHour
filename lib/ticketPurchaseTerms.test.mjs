import test from "node:test";
import assert from "node:assert/strict";
import {
  eventRefundPolicyText,
  DEFAULT_EVENT_REFUND_POLICY,
  SERVICE_FEE_REFUND_POLICY,
} from "./ticketPurchaseTerms.ts";

test("checkout terms use the saved event policy and a stable fallback", () => {
  assert.equal(eventRefundPolicyText("  Refund until Friday  "), "Refund until Friday");
  assert.equal(eventRefundPolicyText("  "), DEFAULT_EVENT_REFUND_POLICY);
  assert.match(SERVICE_FEE_REFUND_POLICY, /full amount paid, including the Function Hour service fee/);
});
