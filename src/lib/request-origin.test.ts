import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedRequestOrigin } from "./request-origin.ts";

function withSiteUrl(value: string | undefined, run: () => void) {
  const previous = process.env.SITE_URL;
  if (value === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = value;
  try { run(); } finally {
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
}

test("same-origin requests and missing Origin preserve existing default behavior", () => {
  withSiteUrl(undefined, () => {
    const url = "https://11local.vn/api/admin/contributions/decision";
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: { origin: "https://11local.vn" } })), true);
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: { origin: "https://evil.example" } })), false);
    assert.equal(isAllowedRequestOrigin(new Request(url)), true);
    assert.equal(isAllowedRequestOrigin(new Request(url), true), false);
  });
});

test("trusted SITE_URL works when reverse proxy rewrites the internal request URL", () => {
  withSiteUrl("https://11local.vn/", () => {
    const url = "http://11local-app:3000/api/admin/contributions/decision";
    const good = new Request(url, { headers: { origin: "https://11local.vn" } });
    assert.equal(isAllowedRequestOrigin(good), true);
    assert.equal(isAllowedRequestOrigin(good, true), true);
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: {
      origin: "https://attacker.example", "x-forwarded-host": "11local.vn",
      "x-forwarded-proto": "https",
    } })), false);
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: { origin: "http://11local.vn" } })), false);
  });
});

test("invalid configuration and malformed Origin fail closed", () => {
  withSiteUrl("not-a-url", () => {
    assert.equal(isAllowedRequestOrigin(new Request("https://11local.vn/api", {
      headers: { origin: "https://11local.vn" },
    })), false);
  });
  withSiteUrl("https://11local.vn", () => {
    for (const origin of ["null", "https://11local.vn.evil.example", "https://11local.vn/path",
      "https://11local.vn/", "http://11local.vn", "file://11local.vn"]) {
      assert.equal(isAllowedRequestOrigin(new Request("http://internal:3000/api", {
        headers: { origin },
      })), false, origin);
    }
  });
});
