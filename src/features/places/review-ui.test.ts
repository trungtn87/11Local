import assert from "node:assert/strict";
import test from "node:test";
import { reviewFeedback, reviewPageCount, reviewRatingRows, reviewStatusMessage } from "./review-ui.ts";

test("rating distribution is descending and does not fabricate stars", () => {
  const rows = reviewRatingRows([{ stars: 5, count: "3" }, { stars: 4, count: 1 }], 4);
  assert.deepEqual(rows.map(item => item.stars), [5, 4, 3, 2, 1]);
  assert.deepEqual(rows.map(item => item.count), [3, 1, 0, 0, 0]);
  assert.equal(rows[0].ratio, 75);
  assert.equal(reviewRatingRows([], 0)[0].ratio, 0);
  assert.equal(reviewRatingRows([{ stars: 5, count: 99 }], 1)[0].ratio, 100);
});

test("review pagination uses exact approved count", () => {
  assert.equal(reviewPageCount(0), 1);
  assert.equal(reviewPageCount(10), 1);
  assert.equal(reviewPageCount(11), 2);
  assert.equal(reviewPageCount(41, 20), 3);
});

test("pending revision keeps the public review while waiting", () => {
  assert.match(reviewStatusMessage("approved", true), /cũ vẫn công khai/);
  assert.match(reviewStatusMessage("pending", false), /chờ Admin/);
  assert.match(reviewStatusMessage("rejected", false), /chỉnh sửa/);
  assert.match(reviewFeedback("STALE_VERSION"), /tải lại/);
});
