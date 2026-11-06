import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlace, placeLabel } from "./passportPlaces.ts";

test("passport counts cities independently of case and extra whitespace", () => {
  const cities = ["Dubai", " Los Angeles ", "los  angeles"];
  assert.equal(new Set(cities.map(normalizePlace)).size, 2);
  assert.equal(placeLabel("  Los  Angeles "), "Los Angeles");
  assert.equal(normalizePlace(" \t "), "");
});
