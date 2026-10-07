import assert from "node:assert/strict";
import test from "node:test";
import { isEventUpcoming, requireEventSalesOpen } from "./eventDates.ts";

test("a cancelled or postponed event is absent from discovery and cannot sell", () => {
  const eventDate = Date.now() + 86_400_000;
  for (const eventStatus of ["cancelled", "postponed"]) {
    const event = { eventDate, eventStatus };
    assert.equal(isEventUpcoming(event), false);
    assert.throws(() => requireEventSalesOpen(event), /paused/);
  }
  assert.equal(isEventUpcoming({ eventDate, eventStatus: "scheduled" }), true);
  assert.doesNotThrow(() => requireEventSalesOpen({ eventDate, eventStatus: "scheduled" }));
});

test("ticket sales stop at the organizer cutoff or sold-out inventory", () => {
  const event = { eventDate: Date.now() + 86_400_000 };
  assert.doesNotThrow(() => requireEventSalesOpen({ ...event, salesEndAt: Date.now() + 60_000 }));
  assert.throws(() => requireEventSalesOpen({ ...event, salesEndAt: Date.now() - 1 }), /deadline/);
  assert.throws(() => requireEventSalesOpen({ ...event, isSoldOut: true }), /sold out/);
  assert.throws(() => requireEventSalesOpen({ ...event, totalTickets: 20, ticketsSold: 20 }), /sold out/);
  assert.doesNotThrow(() => requireEventSalesOpen({ ...event, totalTickets: 20, ticketsSold: 19 }));
  assert.doesNotThrow(() => requireEventSalesOpen({ ...event, totalTickets: 0 }));
});
