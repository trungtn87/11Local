import assert from "node:assert/strict";
import test from "node:test";
import { resolveCategoryMarker } from "./place-marker.ts";

test("uses category icons from Neon for built-in categories", () => {
  assert.deepEqual(resolveCategoryMarker("coffee", "food"), { kind: "symbol", symbol: "☕" });
  assert.deepEqual(resolveCategoryMarker("mountain", "sight"), { kind: "symbol", symbol: "⛰️" });
});

test("uses an uploaded category icon URL without trusting arbitrary paths", () => {
  const id = "a1234567-b123-c123-d123-e123456789ab";
  assert.deepEqual(resolveCategoryMarker("custom:" + id, "cafe"), {
    kind: "image", src: "/api/category-icons/" + id, fallback: "☕",
  });
  assert.deepEqual(resolveCategoryMarker("custom:../../other", "stay"), {
    kind: "symbol", symbol: "🛏️",
  });
});

test("falls back to the known category or a neutral marker", () => {
  assert.deepEqual(resolveCategoryMarker(null, "food"), { kind: "symbol", symbol: "🍜" });
  assert.deepEqual(resolveCategoryMarker("unknown", "unknown"), { kind: "symbol", symbol: "📍" });
});
