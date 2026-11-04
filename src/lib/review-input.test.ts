import assert from "node:assert/strict";
import test from "node:test";
import {
  isReviewUuid, parseReviewInput, parseReviewEdit,
  parseReviewDecision, parseReviewPagination,
} from "./review-input.ts";

const id = "4b609056-1a6f-49d9-9acc-36c6dd7a5fe4";

test("stars-only and written reviews share the same validated input", () => {
  assert.deepEqual(parseReviewInput({ stars: 5 }), { stars: 5, content: "" });
  assert.deepEqual(parseReviewInput({ stars: 4, content: "  Rất đẹp!  " }),
    { stars: 4, content: "Rất đẹp!" });
  for (const stars of [0, 6, 1.5, "5", null, NaN]) {
    assert.throws(() => parseReviewInput({ stars }), /INVALID_STARS/);
  }
});

test("text length, type, controls and malformed payload are rejected", () => {
  assert.equal(parseReviewInput({ stars: 3, content: "x".repeat(1000) }).content.length, 1000);
  for (const content of ["x".repeat(1001), "\u0000", 22, { html: "bad" }]) {
    assert.throws(() => parseReviewInput({ stars: 3, content }), /INVALID_CONTENT/);
  }
  assert.throws(() => parseReviewInput(null), /INVALID_INPUT/);
});

test("review edit requires optimistic version", () => {
  assert.equal(parseReviewEdit({ stars: 1, content: "", expectedVersion: 2 }).expectedVersion, 2);
  for (const expectedVersion of [0, 2.5, "2", -1, null]) {
    assert.throws(() => parseReviewEdit({ stars: 1, expectedVersion }), /INVALID_VERSION/);
  }
});

test("admin decision validates actions and revision targeting", () => {
  assert.deepEqual(parseReviewDecision({ action: "approve", expectedVersion: 1 }),
    { action: "approve", expectedVersion: 1, revisionId: null, note: "" });
  assert.equal(parseReviewDecision({
    action: "reject", expectedVersion: 1, note: "Spam liên tục", revisionId: id,
  }).revisionId, id);
  assert.throws(() => parseReviewDecision({ action: "hide", revisionId: id, expectedVersion: 1, note: "Sai sự thật" }), /INVALID_ACTION/);
  assert.throws(() => parseReviewDecision({ action: "reject", expectedVersion: 1, note: "Sai" }), /REASON_REQUIRED/);
  assert.throws(() => parseReviewDecision({ action: "delete", expectedVersion: 1 }), /INVALID_ACTION/);
});

test("UUID and pagination restrict database lookup", () => {
  assert.equal(isReviewUuid(id), true);
  assert.equal(isReviewUuid("abc"), false);
  assert.deepEqual(parseReviewPagination(new URLSearchParams("page=2&limit=20")),
    { page: 2, limit: 20, offset: 20 });
  assert.throws(() => parseReviewPagination(new URLSearchParams("limit=100")), /INVALID_PAGINATION/);
  assert.throws(() => parseReviewPagination(new URLSearchParams("page=-1")), /INVALID_PAGINATION/);
});
