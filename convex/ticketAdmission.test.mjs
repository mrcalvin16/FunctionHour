import assert from "node:assert/strict";
import test from "node:test";
import { isTicketEligibleForAdmission } from "./ticketAdmission.ts";

test("refunded, cancelled, revoked and pending tickets cannot be admitted", () => {
  for (const status of ["refunded", "cancelled", "revoked", "pending", "disputed"]) {
    assert.equal(isTicketEligibleForAdmission({ status }), false, status);
  }
  assert.equal(isTicketEligibleForAdmission({ status: "active", revokedAt: Date.now() }), false);
  assert.equal(isTicketEligibleForAdmission({ status: "active" }), true);
  assert.equal(isTicketEligibleForAdmission({ status: "checked_in" }), true);
});
