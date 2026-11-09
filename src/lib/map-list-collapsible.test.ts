import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("map place list can be collapsed and remains accessible", () => {
  const source = readFileSync(new URL("../components/memory-map.tsx", import.meta.url), "utf8");
  assert.match(source, /aria-expanded=\{listExpanded\}/);
  assert.match(source, /aria-controls="gau-map-list-content"/);
  assert.match(source, /id="gau-map-list-content"/);
  assert.match(source, /hidden=\{!listExpanded\}/);
  assert.match(source, /onClick=\{\(\) => setListOverride\(!listExpanded\)\}/);
});

test("mobile list defaults collapsed while desktop defaults expanded", () => {
  const source = readFileSync(new URL("../components/memory-map.tsx", import.meta.url), "utf8");
  assert.match(source, /useState\(false\)/);
  assert.match(source, /min-width: 781px/);
  assert.match(source, /listOverride \?\? desktop/);
  const styles = readFileSync(new URL("../app/ban-do/map-page.css", import.meta.url), "utf8");
  assert.match(styles, /\.gau-map-list-content\[hidden\] \{ display: none; \}/);
});
