import assert from "node:assert/strict";
import test from "node:test";
import { MAP_CATEGORIES, parseMapPlace } from "./map-place.ts";

const id = "01234567-89ab-4cde-8fed-0123456789ab";
const valid = { title: "Thác Bản Giốc", latitude: 22.853, longitude: 106.724, kind: "curated",
 category: "travel", visibility: true, album_ids: [id,id], visited_on: null };

test("category whitelist includes six choices", () => {
  assert.deepEqual(MAP_CATEGORIES.map(item => item.value), ["food","travel","play","stay","landmark","other"]);
});
test("valid map place is parsed with deduplicated albums", () => {
  const result = parseMapPlace(valid);
  assert.ok("data" in result);
  assert.deepEqual(result.data.album_ids,[id]);
  assert.equal(result.data.kind,"curated");
});
test("invalid geo, kind, category, or visibility is rejected", () => {
  for (const patch of [
    { latitude: NaN }, { longitude: 181 }, { category: "unknown" },
    { kind: "external" }, { visibility: "true" }, { album_ids: ["not-a-uuid"] },
  ]) assert.ok("error" in parseMapPlace({ ...valid, ...patch }),JSON.stringify(patch));
});
test("optional date validation does not accept impossible dates", () => {
  assert.ok("error" in parseMapPlace({...valid,visited_on:"2026-02-30"}));
});
