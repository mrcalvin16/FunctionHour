import assert from "node:assert/strict";
import test from "node:test";
import { isEventPast, isEventUpcoming, requireEventSalesOpen } from "./eventDates.ts";

test("organizer history includes ended events but not unknown, cancelled, or postponed dates", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  assert.equal(isEventPast({ eventDate: now - 1 }, now), true);
  assert.equal(isEventPast({ eventDate: now }, now), false);
  assert.equal(isEventPast({ eventDate: now + 1 }, now), false);
  assert.equal(isEventPast({}, now), false);
  assert.equal(isEventPast({ dateString: "not-a-date" }, now), false);
  assert.equal(isEventPast({ dateString: "2026-10-07" }, now), true);
  assert.equal(isEventPast({ dateString: "2026-10-08" }, now), false);
  for (const eventStatus of ["cancelled", "postponed"]) {
    assert.equal(isEventPast({ eventDate: now - 1, eventStatus }, now), false);
  }
});

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
