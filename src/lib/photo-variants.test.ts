import test from "node:test";
import assert from "node:assert/strict";
import { photoPreset } from "./photo-variants.ts";

test("public variants have bounded dimensions", () => {
  assert.deepEqual(photoPreset("thumb"), { width: 260, height: 260 });
  assert.deepEqual(photoPreset("card"), { width: 760, height: 570 });
  assert.deepEqual(photoPreset("detail"), { width: 1200, height: 900 });
});

test("original images remain available for existing consumers and OG previews", () => {
  assert.equal(photoPreset(null), null);
});

test("arbitrary sizes and prototype keys are rejected", () => {
  for (const input of ["480", "10000", "__proto__", "constructor", "", "thumb%20"]) {
    assert.equal(photoPreset(input), undefined);
  }
});
