import assert from "node:assert/strict";
import test from "node:test";
import { parsePlaceInput } from "./place-input.ts";
import { validatePlaceDetails } from "./place-extra-fields.ts";

const fixture = () => ({
  name: "Pác Bó", categoryId: "sight", description: "Di tích", address: "Hà Quảng",
  area: "Cao Bằng", latitude: 22.9779, longitude: 106.0504,
});

test("validates dynamic category IDs without hardcoded category list", () => {
  const parsed = parsePlaceInput({ ...fixture(), categoryId: "new_tourism_category" });
  assert.equal(parsed.categoryId, "new_tourism_category");
});

test("defaults attractions to an attraction type and accepts basic V2 data", () => {
  const parsed = parsePlaceInput({ ...fixture(), summary: "Một địa điểm tham quan", websiteUrl: "https://example.org", featuredRank: 2 });
  assert.equal(parsed.placeKind, "attraction");
  assert.equal(parsed.featuredRank, 2);
  assert.equal(parsed.details.something, undefined);
});

test("rejects unsafe URLs and invalid coordinates", () => {
  assert.throws(() => parsePlaceInput({ ...fixture(), websiteUrl: "javascript:alert(1)" }), /INVALID_WEBSITE_URL/);
  assert.equal(parsePlaceInput({ ...fixture(), facebookUrl: "https://facebook.com/cb" }).facebookUrl, "https://facebook.com/cb");
  assert.throws(() => parsePlaceInput({ ...fixture(), youtubeUrl: "https://evil.test/video" }), /INVALID_YOUTUBE_URL/);
  assert.throws(() => parsePlaceInput({ ...fixture(), latitude: null }), /INVALID_LATITUDE/);
  assert.throws(() => parsePlaceInput({ ...fixture(), longitude: "106" }), /INVALID_LONGITUDE/);
  assert.throws(() => parsePlaceInput({ ...fixture(), details: [] }), /INVALID_DETAILS/);
});

const fields = [
  { field_key: "parking_available", field_type: "boolean", label: "Parking", options: [], is_required: false },
  { field_key: "suggested_duration_minutes", field_type: "number", label: "Duration", options: [], is_required: false },
  { field_key: "amenities", field_type: "multi_select", label: "Amenities", options: ["Wifi", "Breakfast"], is_required: false },
  { field_key: "title", field_type: "text", label: "Title", options: [], is_required: true },
];

test("details preserve false and zero, omit optional empty fields", () => {
  assert.deepEqual(
    validatePlaceDetails({ parking_available: false, suggested_duration_minutes: 0, title: "  Địa điểm " }, fields),
    { parking_available: false, suggested_duration_minutes: 0, title: "Địa điểm" },
  );
});

test("rejects unknown, malformed or unauthorized detail values", () => {
  assert.throws(() => validatePlaceDetails({ title: "Hello", bogus: "no" }, fields), /UNKNOWN_DETAIL_FIELD/);
  assert.throws(() => validatePlaceDetails({ title: "Hello", amenities: ["Hacker"] }, fields), /INVALID_DETAIL_FIELD/);
  assert.throws(() => validatePlaceDetails({ parking_available: true }, fields), /REQUIRED_DETAIL_FIELD/);
  assert.throws(() => validatePlaceDetails({ title: "Hello", parking_available: "false" }, fields), /INVALID_DETAIL_FIELD/);
});
