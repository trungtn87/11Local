import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canCommitPinTap } from "./map-pin-selection.ts";

test("single map tap selects, while zooming and double taps do not", () => {
  assert.equal(canCommitPinTap(false,1,1000,0),true);
  assert.equal(canCommitPinTap(true,1,1000,0),false);
  assert.equal(canCommitPinTap(false,2,1000,0),false);
});

test("pinch zoom does not choose another coordinate during the cooldown", () => {
  assert.equal(canCommitPinTap(false,1,1200,1550),false);
  assert.equal(canCommitPinTap(false,1,1550,1550),true);
});

test("draggable pin tip is anchored to its map coordinate without overriding MapLibre position", () => {
  const picker=readFileSync(new URL("../components/contribution-pin-picker.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../components/upload-form.module.css",import.meta.url),"utf8");
  assert.match(picker,/new Marker\(\{element:markerElement,draggable:true,anchor:"bottom"\}\)/);
  assert.match(picker,/map\.on\("zoomstart",cancelPendingTap\)/);
  assert.match(picker,/map\.on\("dblclick",cancelPendingTap\)/);
  const start=css.indexOf(".draggablePin{");
  assert.ok(start>=0);
  const end=css.indexOf("}",start);
  const markerCss=css.slice(start,end);
  assert.doesNotMatch(markerCss,/transform\s*:/);
  assert.match(css,/\.draggablePinShape::before\{/);
});
