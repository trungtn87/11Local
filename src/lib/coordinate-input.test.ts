import assert from "node:assert/strict";
import test from "node:test";
import { parseCoordinateInput } from "./coordinate-input.ts";

test("accepts decimal coordinates including Vietnamese decimal commas and zero", () => {
  assert.equal(parseCoordinateInput("22.9779", -90, 90), 22.9779);
  assert.equal(parseCoordinateInput(" 106,0504 ", -180, 180), 106.0504);
  assert.equal(parseCoordinateInput("0", -90, 90), 0);
  assert.equal(parseCoordinateInput("-0.25", -90, 90), -0.25);
});

test("rejects empty, invalid, and out-of-range coordinates", () => {
  for (const raw of ["", " ", "22,977,9", "abc", "NaN", "1e7", "91"]) {
    assert.equal(parseCoordinateInput(raw, -90, 90), null, raw);
  }
  assert.equal(parseCoordinateInput("-181", -180, 180), null);
});
