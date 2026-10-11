import test from "node:test";
import assert from "node:assert/strict";
import { eventTaxLocationKey, isEventTaxReviewCurrent, organizerTicketProceeds } from "./ticketTax.ts";

test("a venue move invalidates the reviewed tax location", () => {
  const event = { venueAddress: "123 Main St", city: "Mobile", state: "AL" };
  const taxPolicy = { mode: "collect", taxRateId: "txr_example", ratePercentage: 10,
    venuePostalCode: "36602", locationKey: eventTaxLocationKey(event), reason: "Reviewed rate", reviewedAt: 1, reviewedBy: "ops" };
  assert.equal(isEventTaxReviewCurrent({ ...event, taxPolicy }), true);
  assert.equal(isEventTaxReviewCurrent({ ...event, city: "Houston", taxPolicy }), false);
});

test("tax and refund shares are excluded from organizer proceeds", () => {
  const order = { grossAmount: 110, platformFeeAmount: 10, taxAmount: 10, refundedAmount: 0 };
  assert.equal(organizerTicketProceeds(order), 90);
  assert.equal(organizerTicketProceeds({ ...order, refundedAmount: 55 }), 45);
  assert.equal(organizerTicketProceeds({ ...order, refundedAmount: 110 }), 0);
  assert.equal(organizerTicketProceeds({ grossAmount: 110, platformFeeAmount: 10, refundedAmount: 55 }), 45);
});
