import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_ICON_OPTIONS, parseCategoryCreate, parseCategoryPatch, parseCategoryOrder } from "./admin-category-input.ts";

test("create category preserves legacy identifiers without rewriting", () => {
  assert.deepEqual(parseCategoryCreate({ id: "local_market", name: " Chợ địa phương ", icon: "shopping-bag" }),
    { id: "local_market", name: "Chợ địa phương", icon: "shopping-bag", visibility: "visible" });
});

test("reject invalid IDs, icons and public visibility", () => {
  assert.throws(() => parseCategoryCreate({ id: "Food Name", name: "Foo", icon: "bed" }));
  assert.throws(() => parseCategoryCreate({ id: "food", name: "Foo", icon: "unmapped" }));
  assert.throws(() => parseCategoryCreate({ id: "food", name: "Foo", icon: "bed", visibility: "deleted" }));
  assert.equal(CATEGORY_ICON_OPTIONS.length, 6);
});

test("edit can hide a category but cannot change its id or sorting field", () => {
  assert.deepEqual(parseCategoryPatch({ visibility: "hidden" }), { visibility: "hidden" });
  assert.throws(() => parseCategoryPatch({ id: "new-id", name: "Other" }));
  assert.throws(() => parseCategoryPatch({ sort_order: 99 }));
  assert.throws(() => parseCategoryPatch({ visibility: "invalid" }));
});

test("reordering rejects missing, duplicate, or invalid lists", () => {
  assert.deepEqual(parseCategoryOrder({ ids: ["food", "cafe", "stay"] }), ["food", "cafe", "stay"]);
  assert.throws(() => parseCategoryOrder({ ids: ["food", "food"] }));
  assert.throws(() => parseCategoryOrder({ ids: [] }));
  assert.throws(() => parseCategoryOrder({ ids: "food" }));
});
