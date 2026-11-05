import assert from "node:assert/strict";
import test from "node:test";
import { parseMapReferencePlaces } from "./map-reference-places.ts";

test("parses published map reference markers with custom category icons", () => {
  assert.deepEqual(parseMapReferencePlaces({ places: [
    { slug: "quan-cham", name: "Chạm", category_id: "food",
      category_name: "Ăn uống", category_icon: "custom:a1234567-b123-c123-d123-e123456789ab",
      latitude: 22.67, longitude: 106.25 },
  ] }), [{
    slug: "quan-cham", name: "Chạm", category_id: "food",
    category_name: "Ăn uống", category_icon: "custom:a1234567-b123-c123-d123-e123456789ab",
    latitude: 22.67, longitude: 106.25,
  }]);
});

test("ignores invalid locations, missing names, and empty responses", () => {
  assert.deepEqual(parseMapReferencePlaces(undefined), []);
  assert.deepEqual(parseMapReferencePlaces({ places: null }), []);
  assert.deepEqual(parseMapReferencePlaces({ places: [
    { slug: "invalid-lat", name: "A", latitude: 92, longitude: 106 },
    { slug: "invalid-lng", name: "B", latitude: 22, longitude: 181 },
    { slug: "invalid-coords", name: "C", latitude: "bad", longitude: 106 },
    { slug: "missing-name", latitude: 22, longitude: 106 },
    { slug: "ok", name: "Hợp lệ", latitude: 22, longitude: 106 },
  ] }).map(place => place.slug), ["ok"]);
});
