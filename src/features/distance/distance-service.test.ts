import assert from "node:assert/strict";
import test from "node:test";

import { formatApproximateDistance, haversineDistanceProvider } from "./distance-service.ts";

test("Haversine trả về contract đường thẳng và nguồn tính", () => {
  const result = haversineDistanceProvider.calculate(
    { latitude: 22.6666, longitude: 106.2588 },
    { latitude: 22.6736, longitude: 106.2588 },
  );

  assert.equal(result.type, "straight-line");
  assert.equal(result.source, "haversine");
  assert.ok(result.valueMeters > 750 && result.valueMeters < 800);
});

test("định dạng khoảng cách gần đúng theo tiếng Việt", () => {
  assert.equal(
    formatApproximateDistance({ valueMeters: 846, type: "straight-line", source: "haversine" }),
    "≈ 850 m",
  );
  assert.equal(
    formatApproximateDistance({ valueMeters: 2340, type: "straight-line", source: "haversine" }),
    "≈ 2,3 km",
  );
});
