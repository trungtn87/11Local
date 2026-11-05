import assert from "node:assert/strict";
import test from "node:test";
import { attachPlaceLabelZoom, PLACE_LABEL_MIN_ZOOM, shouldShowPlaceNames } from "./marker-zoom.ts";

test("zooming out hides place names; zooming in shows them", () => {
  assert.equal(shouldShowPlaceNames(9.2), false);
  assert.equal(shouldShowPlaceNames(12.99), false);
  assert.equal(shouldShowPlaceNames(13.9), false);
  assert.equal(shouldShowPlaceNames(PLACE_LABEL_MIN_ZOOM), true);
  assert.equal(shouldShowPlaceNames(14), true);
  assert.equal(shouldShowPlaceNames(Number.NaN), false);
});

test("attached marker labels track map zoom and clean up listeners", () => {
  let zoom = 9;
  const classes = new Set<string>();
  let listener: (() => void) | null = null;
  const map = {
    getZoom: () => zoom,
    getContainer: () => ({
      classList: {
        toggle: (token: string, forced: boolean) => forced ? classes.add(token) : classes.delete(token),
        remove: (token: string) => { classes.delete(token); },
      },
    }),
    on: (_type: "zoom", callback: () => void) => { listener = callback; },
    off: (_type: "zoom", callback: () => void) => {
      if (listener === callback) listener = null;
    },
  };
  const dispose = attachPlaceLabelZoom(map);
  assert.equal(classes.has("local-place-labels-compact"), true);
  zoom = 14;
  (listener as (() => void) | null)?.();
  assert.equal(classes.has("local-place-labels-compact"), false);
  zoom = 12;
  (listener as (() => void) | null)?.();
  assert.equal(classes.has("local-place-labels-compact"), true);
  dispose();
  assert.equal(classes.size, 0);
  assert.equal(listener, null);
});
