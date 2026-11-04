import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

// Verify the public HTML contains real page structure before hydration, even
// when no Neon secret is present in CI. A seeded DB integration smoke follows
// during deployment; this catches a regression to the old splash-only HTML.
const port = 43927;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
  { env: { ...process.env, DATABASE_URL: "" }, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
child.stdout.on("data", (part) => { logs += String(part); });
child.stderr.on("data", (part) => { logs += String(part); });

async function get(path) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error("Next server exited: " + logs.slice(-3000));
    try {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(4500) });
      assert.equal(response.status, 200, path + " should return 200");
      return response.text();
    } catch (error) {
      if (attempt === 39) throw error;
      await sleep(300);
    }
  }
  throw new Error("Server did not start: " + logs.slice(-3000));
}

try {
  const home = await get("/");
  assert.match(home, /discovery-home/, "home must have server-rendered discovery structure");
  assert.match(home, /Khám phá/, "home must contain the discovery section");
  assert.doesNotMatch(home, /Đang mở 11Local…/, "home must not be the old splash page");

  const search = await get("/tim-kiem");
  assert.match(search, /Địa điểm ở Cao Bằng/, "search must contain server-rendered heading");
  assert.doesNotMatch(search, /Đang mở 11Local…/, "search must not be the old splash page");

  const robots = await get("/robots.txt");
  assert.ok(robots.includes("sitemap.xml"), "robots must point to the public sitemap");

  const unpublished = await fetch(origin + "/dia-diem/INVALID_SLUG", {
    signal: AbortSignal.timeout(4500),
  });
  assert.equal(unpublished.status, 404, "invalid place URL must never be indexable");

  const invalidSize = await fetch(
    origin + "/api/place-photos/11111111-1111-4111-8111-111111111111?size=10000",
    { signal: AbortSignal.timeout(4500) },
  );
  assert.equal(invalidSize.status, 400, "arbitrary public image resize must be blocked: " + await invalidSize.text());

  console.log("SSR HTML smoke passed: home, search, robots, place URL, image guard.");
} catch (error) {
  console.error(error);
  console.error(logs.slice(-3000));
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
}
