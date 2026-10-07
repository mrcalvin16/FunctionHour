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
