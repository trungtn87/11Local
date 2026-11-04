import test from "node:test";
import assert from "node:assert/strict";
import { parseFieldCreate, parseFieldPatch, parseFieldOrder, validateFieldOptions, choiceValueCompatible } from "./admin-category-fields.ts";

test("create a select field with typed options", () => {
  assert.deepEqual(parseFieldCreate({
    field_key: "amenities", label: " Tiện nghi ", field_type: "multi_select",
    options: ["Wifi", "Bãi đỗ xe"], is_required: false,
  }), {
    field_key: "amenities", label: "Tiện nghi", field_type: "multi_select",
    options: ["Wifi", "Bãi đỗ xe"], help_text: null, is_required: false, is_visible: true,
  });
});
test("reject malformed field keys and unrecognized types", () => {
  assert.throws(() => parseFieldCreate({ field_key: "not-valid", label: "A", field_type: "text" }));
  assert.throws(() => parseFieldCreate({ field_key: "ok", label: "A", field_type: "date" }));
  assert.throws(() => parseFieldCreate({ field_key: "ok", label: "A", field_type: "text", options: ["oops"] }));
});
test("options must be unique and required for a select", () => {
  assert.throws(() => parseFieldCreate({ field_key: "ok", label: "A", field_type: "select" }));
  assert.throws(() => parseFieldCreate({ field_key: "ok", label: "A", field_type: "select", options: ["A", " A "] }));
});
test("patch does not accept key or category changes", () => {
  assert.deepEqual(parseFieldPatch({ is_visible: false }), { is_visible: false });
  assert.throws(() => parseFieldPatch({ field_key: "new" }));
  assert.throws(() => parseFieldPatch({ category_id: "new" }));
  assert.throws(() => parseFieldPatch({ sort_order: 5 }));
  assert.throws(() => parseFieldPatch({ is_required: "true" }));
  assert.doesNotThrow(() => validateFieldOptions({ field_type: "text", options: [] }));
});
test("existing select values must remain compatible with new options", () => {
  assert.equal(choiceValueCompatible("Wifi", "select", ["Wifi"]), true);
  assert.equal(choiceValueCompatible("Wifi", "select", ["Khác"]), false);
  assert.equal(choiceValueCompatible(["Wifi", "Điều hòa"], "multi_select", ["Wifi"]), false);
  assert.equal(choiceValueCompatible(["Wifi"], "multi_select", ["Wifi"]), true);
});
test("reordering validates UUIDs and prevents duplicate ids", () => {
  const one = "11111111-1111-4111-8111-111111111111";
  const two = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(parseFieldOrder({ ids: [one, two] }), [one, two]);
  assert.throws(() => parseFieldOrder({ ids: [one, one] }));
  assert.throws(() => parseFieldOrder({ ids: ["bad"] }));
});
