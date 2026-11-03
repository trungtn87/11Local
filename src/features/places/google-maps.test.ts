import assert from "node:assert/strict";
import test from "node:test";

import { getGoogleMapsDirectionsUrl } from "./google-maps.ts";

test("tạo URL Google Maps bằng tọa độ và không cần Directions API key", () => {
  const url = getGoogleMapsDirectionsUrl({ latitude: 22.8531, longitude: 106.722 });
  assert.equal(
    url,
    "https://www.google.com/maps/dir/?api=1&destination=22.8531%2C106.722",
  );
  assert.ok(!url.includes("key="));
});
