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

test("public Host remains same-origin even when SITE_URL is stale or URL is internal", () => {
  withSiteUrl("https://one1local-web.onrender.com", () => {
    const url = "http://container:3000/api/admin/contributions/decision";
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: {
      origin: "https://11local.vn", host: "11local.vn",
    } })), true);
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: {
      origin: "https://www.11local.vn", host: "www.11local.vn",
    } })), true);
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: {
      origin: "https://attacker.example", host: "11local.vn",
      "x-forwarded-host": "attacker.example",
    } })), false);
    assert.equal(isAllowedRequestOrigin(new Request(url, { headers: {
      origin: "https://attacker.example", host: "container:3000",
      "x-forwarded-host": "attacker.example",
    } })), false);
  });
});

test("malformed Host never bypasses mismatched SITE_URL", () => {
  withSiteUrl("https://11local.vn", () => {
    const url = "http://container:3000/api/admin/contributions/decision";
    for (const host of ["attacker.example, 11local.vn", "http://attacker.example", "11local.vn/path", "11local.vn@attacker.example"]) {
      assert.equal(isAllowedRequestOrigin(new Request(url, { headers: {
        origin: "https://attacker.example", host,
      } })), false, host);
    }
  });
});

// Validate deployment case without depending on the Node test runner process env.
test("production domain remains valid behind internal reverse proxy when SITE_URL is stale", () => {
  withSiteUrl("https://one1local-web.onrender.com", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      assert.equal(isAllowedRequestOrigin(new Request("http://11local-app:3000/api/reviews", {
        headers: { origin: "https://11local.vn", host: "11local-app:3000" },
      })), true);
      assert.equal(isAllowedRequestOrigin(new Request("http://11local-app:3000/api/reviews", {
        headers: { origin: "https://attacker.example", host: "11local-app:3000" },
      })), false);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});
