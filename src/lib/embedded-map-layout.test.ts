import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function rule(source: string, selector: string) {
  const match = source.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`));
  assert.ok(match, `Missing .${selector} CSS rule`);
  return match[1];
}

test("embedded map remains inside the contribution and admin pin frames", () => {
  const mapCss = readFileSync(new URL("../features/map/map-canvas.module.css", import.meta.url), "utf8");
  const frameCss = readFileSync(new URL("../components/upload-form.module.css", import.meta.url), "utf8");

  // Absolute positioning here escapes the frame if a caller omits position:relative.
  const embedded = rule(mapCss, "embedded");
  assert.match(embedded, /position:\\s*relative\\s*;/);
  assert.match(embedded, /width:\\s*100%\\s*;/);
  assert.match(embedded, /height:\\s*100%\\s*;/);

  // The map picker provides its own positioning boundary for future overlays too.
  assert.match(rule(frameCss, "mapFrame"), /position:\\s*relative\\s*;/);
});
