import test from "node:test";
import assert from "node:assert/strict";
import { allocateTicketCents, ticketFeeCents, ticketFeeTotalCents } from "./ticketServiceFee.ts";

test("standard $20 ticket is $2.52 fee", () => {
  assert.equal(ticketFeeCents(2000), 252);
  assert.equal(2000 + ticketFeeCents(2000), 2252);
});
test("free admission carries no ticket service fee", () => {
  assert.equal(ticketFeeCents(0), 0);
  assert.equal(ticketFeeTotalCents(0, 2), 0);
});
test("multi-ticket discounted subtotals retain every cent", () => {
  const groups = allocateTicketCents(901, 3);
  assert.equal(groups.reduce((sum, group) => sum + group.unitCents * group.quantity, 0), 901);
  assert.equal(groups.reduce((sum, group) => sum + group.quantity, 0), 3);
  assert.equal(ticketFeeTotalCents(901, 3), groups.reduce((sum, group) => sum + ticketFeeCents(group.unitCents) * group.quantity, 0));
});
test("discount to zero removes ticket service fee", () => {
  assert.equal(ticketFeeTotalCents(0, 3), 0);
});
test("invalid amounts are rejected", () => {
  assert.throws(() => allocateTicketCents(-1, 2));
  assert.throws(() => allocateTicketCents(100, 0));
});
