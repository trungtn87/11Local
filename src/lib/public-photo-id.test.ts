import test from "node:test";
import assert from "node:assert/strict";
import { isPublicPhotoId } from "./public-photo-id.ts";

test("accepts the full 8-4-4-4-12 UUID format used by Neon photo IDs", () => {
  assert.equal(isPublicPhotoId("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isPublicPhotoId("AABBCCDD-EEFF-4000-8000-112233445566"), true);
});

test("rejects shortened UUIDs, SQL-like input and invalid values", () => {
  for (const id of [
    "11111111-1111-4111-111111111111", // old broken 8-4-4-12 pattern
    "aabbccdd-eeff-gggg-8000-112233445566",
    "not-an-id", null, {}, "", "1' OR 1=1",
  ]) assert.equal(isPublicPhotoId(id), false);
});
