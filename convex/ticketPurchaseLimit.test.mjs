import test from "node:test";
import assert from "node:assert/strict";
import { assertTicketPurchaseQuantity, validateTicketPurchaseLimit } from "./ticketPurchaseLimit.ts";
test("organizer limits reject excess and malformed quantities", () => {
  assert.doesNotThrow(() => assertTicketPurchaseQuantity(2, 2));
  for (const quantity of [3, 0, -1, 1.5, NaN, Infinity]) assert.throws(() => assertTicketPurchaseQuantity(quantity, 2));
  assert.doesNotThrow(() => assertTicketPurchaseQuantity(10));
  assert.throws(() => assertTicketPurchaseQuantity(11));
  for (const limit of [0, 11, 2.5, NaN]) assert.throws(() => validateTicketPurchaseLimit(limit));
});
