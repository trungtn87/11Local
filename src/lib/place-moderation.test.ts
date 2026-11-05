import assert from "node:assert/strict";
import test from "node:test";
import { parseExpectedVersion, parsePlaceRejection } from "./place-moderation.ts";

test("reject requires a valid optimistic concurrency version", () => {
  for (const expectedVersion of [null, undefined, 0, -1, 1.25, "1", Number.NaN]) {
    assert.throws(() => parsePlaceRejection({ expectedVersion, reason: "Trùng địa điểm" }), /INVALID_VERSION/);
  }
  assert.equal(parseExpectedVersion({ expectedVersion: 2 }), 2);
});
test("reject requires a meaningful and bounded reason", () => {
  assert.throws(() => parsePlaceRejection({ expectedVersion: 1, reason: "  " }), /REASON_REQUIRED/);
  assert.throws(() => parsePlaceRejection({ expectedVersion: 1, reason: " x " }), /REASON_REQUIRED/);
  assert.throws(() => parsePlaceRejection({ expectedVersion: 1, reason: "x".repeat(501) }), /REASON_TOO_LONG/);
  assert.deepEqual(parsePlaceRejection({ expectedVersion: 4, reason: "  Trùng địa điểm  " }), {
    expectedVersion: 4, reason: "Trùng địa điểm",
  });
});
