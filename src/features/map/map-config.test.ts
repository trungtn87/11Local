import assert from "node:assert/strict";
import test from "node:test";

import { CAO_BANG_CAMERA, MAP_STYLE_URL } from "./map-config.ts";

test("camera mặc định hướng tới Cao Bằng", () => {
  const [longitude, latitude] = CAO_BANG_CAMERA.center;

  assert.ok(longitude > 105.5 && longitude < 107);
  assert.ok(latitude > 22 && latitude < 23.5);
  assert.ok(CAO_BANG_CAMERA.zoom >= 8 && CAO_BANG_CAMERA.zoom <= 11);
});

test("style mặc định là nguồn bản đồ công khai dùng dữ liệu OSM", () => {
  assert.match(MAP_STYLE_URL, /^https:\/\/tiles\.openfreemap\.org\//);
});
