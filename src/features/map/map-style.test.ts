import assert from "node:assert/strict";
import test from "node:test";
import { CAO_BANG_CAMERA } from "./map-config.ts";
import { loadFullStyle, type StyleSpec } from "./map-style.ts";

const full: StyleSpec = { version: 8, layers: [
  { id: "background", type: "background" },
  { id: "highway-primary", type: "line", "source-layer": "transportation" },
  { id: "label_town", type: "symbol", "source-layer": "place" },
  { id: "poi_r20", type: "symbol", "source-layer": "poi" },
  { id: "landuse-hospital", type: "fill", "source-layer": "landuse" },
  { id: "poi_transit", type: "symbol", "source-layer": "poi" },
] };
test("preserves POIs, area names and roads", async () => {
  const fakeFetch = (async () => new Response(JSON.stringify(full), { status: 200 })) as typeof fetch;
  const result = await loadFullStyle("https://example.test/style", fakeFetch);
  assert.ok(typeof result !== "string");
  assert.deepEqual(result.layers.map(layer => layer.id), full.layers.map(layer => layer.id));
});
test("retains Cao Bằng camera", () => {
  assert.deepEqual(CAO_BANG_CAMERA.center, [106.2588,22.6666]);
  assert.equal(CAO_BANG_CAMERA.zoom,9.2);
});
test("style service failure falls back to URL", async () => {
  const url = "https://example.test/style";
  assert.equal(await loadFullStyle(url,(async()=>new Response("",{status:503})) as typeof fetch),url);
  assert.equal(await loadFullStyle(url,(async()=>{throw new Error("offline")}) as typeof fetch),url);
});
