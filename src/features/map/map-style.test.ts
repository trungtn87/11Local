import assert from "node:assert/strict";
import test from "node:test";

import { CAO_BANG_CAMERA } from "./map-config.ts";
import {
  isPoiLayer,
  loadCleanStyle,
  sanitizeStyle,
  type StyleSpec,
} from "./map-style.ts";

const style: StyleSpec = {
  version: 8,
  sources: { openmaptiles: { type: "vector" } },
  layers: [
    { id: "background", type: "background" },
    { id: "water", type: "fill", "source-layer": "water" },
    { id: "waterway-river", type: "line", "source-layer": "waterway" },
    { id: "landuse-residential", type: "fill", "source-layer": "landuse" },
    { id: "landuse-hospital", type: "fill", "source-layer": "landuse" },
    { id: "landuse-school", type: "fill", "source-layer": "landuse" },
    { id: "highway-primary", type: "line", "source-layer": "transportation" },
    { id: "highway-name-major", type: "symbol", "source-layer": "transportation_name" },
    { id: "boundary_3", type: "line", "source-layer": "boundary" },
    { id: "label_village", type: "symbol", "source-layer": "place" },
    { id: "label_town", type: "symbol", "source-layer": "place" },
    { id: "water_name_line_label", type: "symbol", "source-layer": "water_name" },
    { id: "poi_r20", type: "symbol", "source-layer": "poi" },
    { id: "poi_r1", type: "symbol", "source-layer": "poi" },
    { id: "poi_transit", type: "symbol", "source-layer": "poi" },
    { id: "airport", type: "symbol", "source-layer": "aerodrome_label" },
    { id: "custom-shop", type: "symbol", "source-layer": "poi" },
    { id: "poi-new-upstream", type: "symbol", "source-layer": "something_new" },
  ],
};

const ids = (s: StyleSpec) => s.layers.map((l) => l.id);

test("layer POI bị loại", () => {
  const result = ids(sanitizeStyle(style));

  for (const id of [
    "poi_r20",
    "poi_r1",
    "poi_transit",
    "airport",
    "custom-shop",
    "poi-new-upstream",
    "landuse-hospital",
    "landuse-school",
  ]) {
    assert.ok(!result.includes(id), id);
  }
});

test("đường, sông hồ, địa giới, khu dân cư và label địa lý được giữ", () => {
  const result = ids(sanitizeStyle(style));

  for (const id of [
    "background",
    "highway-primary",
    "highway-name-major",
    "water",
    "waterway-river",
    "water_name_line_label",
    "boundary_3",
    "landuse-residential",
    "label_village",
    "label_town",
  ]) {
    assert.ok(result.includes(id), id);
  }
});

test("sanitize không đổi style gốc và giữ nguyên phần còn lại", () => {
  const before = ids(style).length;
  const result = sanitizeStyle(style);

  assert.equal(ids(style).length, before);
  assert.equal(result.version, 8);
  assert.deepEqual(result.sources, style.sources);
  assert.ok(isPoiLayer({ id: "poi_r7", type: "symbol" }));
});

test("camera Cao Bằng không bị thay đổi", () => {
  assert.deepEqual(CAO_BANG_CAMERA.center, [106.2588, 22.6666]);
  assert.equal(CAO_BANG_CAMERA.zoom, 9.2);
});

test("tải style thành công trả về bản đã sanitize", async () => {
  const fakeFetch = (async () =>
    new Response(JSON.stringify(style), { status: 200 })) as typeof fetch;
  const result = await loadCleanStyle("https://example.test/style", fakeFetch);

  assert.ok(typeof result !== "string");
  assert.ok(!ids(result).includes("poi_r20"));
});

test("lỗi mạng hoặc HTTP thì fallback về style URL", async () => {
  const url = "https://example.test/style";
  const failing = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  const notOk = (async () => new Response("", { status: 500 })) as typeof fetch;

  assert.equal(await loadCleanStyle(url, failing), url);
  assert.equal(await loadCleanStyle(url, notOk), url);
});
