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

test("host-local schedules are identical on the server and western browsers", () => {
  const original = process.env.TZ;
  const event = { dateString: "2026-12-26T20:00", eventDate: Date.parse("2026-12-27T02:00:00Z"), endDateString: "2026-12-27T00:00", endDate: Date.parse("2026-12-27T06:00:00Z") };
  try {
    const labels = ["UTC", "America/Chicago", "America/Los_Angeles", "Asia/Tokyo"].map(zone => {
      process.env.TZ = zone;
      return attendeeEventDate(event);
    });
    assert.equal(new Set(labels).size, 1);
    assert.match(labels[0], /Sat, December 26, 2026 at 8:00 PM/);
    assert.match(labels[0], /Sun, December 27, 2026 at 12:00 AM/);
    assert.match(labels[0], /event local time/);
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

test("legacy end instants retain duration relative to host-local start", () => {
  const label = attendeeEventDate({ dateString: "2026-12-26T20:00", eventDate: Date.parse("2026-12-27T02:00:00Z"), endDate: Date.parse("2026-12-27T06:00:00Z") });
  assert.match(label, /December 26, 2026 at 8:00 PM/);
  assert.match(label, /December 27, 2026 at 12:00 AM/);
});

test("date-only schedules have no fabricated time and timestamp-only values identify UTC", () => {
  assert.doesNotMatch(attendeeEventDate({ dateString: "2027-02-07" }), /AM|PM/);
  assert.match(attendeeEventDate({ eventDate: Date.parse("2027-02-07T12:00:00Z") }), /12:00 PM UTC/);
  assert.equal(attendeeEventDate({ dateString: "not a date" }), "Date to be announced");
});
