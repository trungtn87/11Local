import assert from "node:assert/strict";
import test from "node:test";
import { parseNewPlaceContribution, isPossibleDuplicate, normalizeContributionName } from "./contribution-input.ts";

const valid = { name: "Quán phở Cô Đào", categoryId: "food", address: "Kim Đồng", area: "Cao Bằng", latitude: 22.6666, longitude: 106.2588 };

test("accepts a public anonymous proposal without requiring phone or account", () => {
  const parsed = parseNewPlaceContribution(valid);
  assert.equal(parsed.contactPhone, "");
  assert.equal(parsed.acknowledgeDuplicate, false);
});
test("rejects absent location, illegal coordinates and hidden placeholder category formats", () => {
  assert.throws(() => parseNewPlaceContribution({ ...valid, latitude: undefined }), /INVALID_LATITUDE/);
  assert.throws(() => parseNewPlaceContribution({ ...valid, longitude: 181 }), /INVALID_LONGITUDE/);
  assert.throws(() => parseNewPlaceContribution({ ...valid, categoryId: "<script>" }), /INVALID_CATEGORY/);
});
test("prevents HTML-sized spam payloads and invalid numbers", () => {
  assert.throws(() => parseNewPlaceContribution({ ...valid, description: "x".repeat(3001) }), /DESCRIPTION_TOO_LONG/);
  assert.throws(() => parseNewPlaceContribution({ ...valid, latitude: "22.6666" }), /INVALID_LATITUDE/);
});
test("recognizes nearby duplicate names with Vietnamese diacritics", () => {
  assert.equal(normalizeContributionName("Phở Cô Đào"), "phocodao");
  assert.equal(isPossibleDuplicate("Phở Cô Đào", 22.66, 106.25, "Pho Co Dao", 22.6602, 106.25), true);
  assert.equal(isPossibleDuplicate("Phở Cô Đào", 22.66, 106.25, "Pho Co Dao", 22.70, 106.25), false);
  assert.equal(isPossibleDuplicate("Phở A", 22.66, 106.25, "Phở B", 22.6601, 106.25), false);
});
