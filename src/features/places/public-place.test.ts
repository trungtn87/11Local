import assert from "node:assert/strict";
import test from "node:test";

import type { PublicPlace } from "./public-place.ts";
import { selectExplorePlaces, selectHotPlaces } from "./public-place.ts";

const base: PublicPlace = {
  id: "1", slug: "one", name: "One", description: "", address: "", area: "",
  latitude: 22.6, longitude: 106.2, category_id: "sight", category_name: "Tham quan",
  ownership_status: "unverified", phone: null,
};

test("Khám phá ưu tiên featured khi Neon có field này", () => {
  const result = selectExplorePlaces([
    { ...base, id: "new", slug: "new", updated_at: "2026-11-03", featured_order: null },
    { ...base, id: "featured", slug: "featured", featured_order: 1 },
  ]);
  assert.equal(result[0]?.id, "featured");
});

test("Hot kết hợp view và rating khi metrics có dữ liệu", () => {
  const result = selectHotPlaces([
    { ...base, id: "popular", slug: "popular", view_count: 1000, rating_avg: 4.5, rating_count: 20 },
    { ...base, id: "unseen", slug: "unseen", view_count: 0, rating_avg: 5, rating_count: 1 },
  ]);
  assert.equal(result[0]?.id, "popular");
});
