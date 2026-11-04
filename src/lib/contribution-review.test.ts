import assert from "node:assert/strict";
import test from "node:test";
import { canReview, contributionSlug, parseReviewDecision, parseReviewPlace } from "./contribution-review.ts";

const valid = {
  name: "Phở chua Cao Bằng", categoryId: "food",
  address: "Kim Đồng", area: "Cao Bằng",
  latitude: 22.67, longitude: 106.25, description: "Món đặc sản",
  summary: "Đặc sản phố", placeKind: "business", details: {},
};
const id = "4b609056-1a6f-49d9-9acc-36c6dd7a5fe4";
test("review draft accepts user-submitted place without requiring credentials", () => {
  const value = parseReviewPlace(valid);
  assert.equal(value.name, valid.name);
  assert.equal(value.websiteUrl, "");
  assert.equal(value.placeKind, "business");
});
test("review rejects unsafe website and excess text", () => {
  assert.throws(() => parseReviewPlace({ ...valid, websiteUrl: "javascript:alert(1)" }), /INVALID_WEBSITE_URL/);
  assert.throws(() => parseReviewPlace({ ...valid, summary: "a".repeat(351) }), /SUMMARY_TOO_LONG/);
});
test("approve only accepts a valid version, place and unique photo IDs", () => {
  const body = { action: "approve", expectedVersion: 1, place: valid, approvedPhotoIds: [id], coverPhotoId: id };
  assert.equal(parseReviewDecision(body).action, "approve");
  assert.throws(() => parseReviewDecision({ ...body, expectedVersion: 0 }), /INVALID_VERSION/);
  assert.throws(() => parseReviewDecision({ ...body, approvedPhotoIds: [id, id] }), /INVALID_PHOTO_SELECTION/);
  assert.throws(() => parseReviewDecision({ ...body, approvedPhotoIds: [], coverPhotoId: id }), /COVER_NOT_SELECTED/);
});
test("reject and needs-info require review reason", () => {
  assert.throws(() => parseReviewDecision({ action: "reject", expectedVersion: 1 }), /REASON_REQUIRED/);
  assert.equal(parseReviewDecision({ action: "needs_info", expectedVersion: 1, note: "Thiếu địa chỉ" }).action, "needs_info");
});
test("completed contribution cannot be reviewed again and unique slug is stable", () => {
  assert.equal(canReview("approved"), false);
  assert.equal(canReview("rejected"), false);
  assert.equal(canReview("needs_info"), true);
  assert.equal(contributionSlug("Phở Chua Cô Đào", id), "pho-chua-co-dao-4b6090561a");
});
