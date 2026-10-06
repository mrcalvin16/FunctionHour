import test from "node:test";
import assert from "node:assert/strict";
import { attendeeEventDate, attendeeVenue } from "./attendeeDisplay.ts";
test("calendar-only dates retain the host's day for western timezones", () => {
  const original = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try { assert.match(attendeeEventDate({ dateString: "2027-02-07", eventDate: Date.parse("2027-02-07") }), /February 7, 2027/); }
  finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
  assert.equal(attendeeEventDate({}), "Date to be announced");
});
test("venue display combines name and city without substituting an organizer", () => {
  assert.equal(attendeeVenue({ venueName: "Central Park", city: "New York", location: "street address" }), "Central Park · New York");
  assert.equal(attendeeVenue({ location: "Houston" }), "Houston");
});
