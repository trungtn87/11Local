import { strict as assert } from "node:assert";
import { test } from "node:test";
import { photoEtag, matchesPhotoEtag } from "./photo-http-cache.ts";

test("photo validator is stable but differs by ID or upload timestamp", () => {
  const a = photoEtag("photo-a", "2026-11-01T10:00:00Z");
  assert.equal(a, photoEtag("photo-a", "2026-11-01T10:00:00Z"));
  assert.notEqual(a, photoEtag("photo-b", "2026-11-01T10:00:00Z"));
  assert.notEqual(a, photoEtag("photo-a", "2026-11-02T10:00:00Z"));
  assert.match(a, /^W\/"gau-photo-[a-f0-9]{32}"$/);
});
test("conditional requests accept only matching validators", () => {
  const a = photoEtag("photo-a", "2026-11-01T10:00:00Z");
  assert.equal(matchesPhotoEtag(null, a), false);
  assert.equal(matchesPhotoEtag('W/"else"', a), false);
  assert.equal(matchesPhotoEtag('W/"else", '+a, a), true);
});
