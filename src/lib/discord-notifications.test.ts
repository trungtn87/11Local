import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDiscordPayload, isDiscordEnabled, retryDelayMs, sendDiscordWebhook,
  validateDiscordNotification, validateDiscordWebhook,
} from "./discord-notifications.ts";

const webhook = "https://discord.com/api/webhooks/123456789/long_token-with.dots";

test("webhook validation rejects SSRF, HTTP, unexpected host and query secrets", () => {
  assert.equal(validateDiscordWebhook(webhook).hostname, "discord.com");
  for (const bad of [
    "http://discord.com/api/webhooks/123/x",
    "https://discord.com.evil.example/api/webhooks/123/x",
    "https://discord.com:444/api/webhooks/123/x",
    "https://discord.com@evil.example/api/webhooks/123/x",
    "https://discord.com/api/webhooks/123/x?wait=true",
    "https://discord.com/api/some-other-endpoint",
  ]) assert.throws(() => validateDiscordWebhook(bad), /INVALID_DISCORD_WEBHOOK/);
});

test("only safe internal admin paths; input bounds enforced", () => {
  const safe = { type: "contribution" as const, title: "Đóng góp mới", description: "Chờ Admin xử lý", actionPath: "/admin/dong-gop" };
  assert.equal(validateDiscordNotification(safe).title, safe.title);
  for (const bad of ["https://evil.example", "//evil.example", "/api/admin", "/admin/../secret", "/admin?token=x"]) {
    assert.throws(() => validateDiscordNotification({ ...safe, actionPath: bad }), /INVALID_DISCORD_ACTION_PATH/);
  }
  assert.throws(() => validateDiscordNotification({ ...safe, description: "x".repeat(1501) }), /INVALID_DISCORD_MESSAGE/);
});

test("embed suppresses all Discord mentions and only links to safe SITE_URL", () => {
  const event = { type: "system" as const, title: "Cảnh báo", description: "@everyone test", actionPath: "/admin" };
  const payload = buildDiscordPayload(event, "https://11local.vn/path");
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
  assert.equal(payload.embeds[0].url, "https://11local.vn/admin");
  assert.equal("url" in buildDiscordPayload(event, "javascript:alert(1)").embeds[0], false);
});

test("disabled by default; explicit true required", () => {
  assert.equal(isDiscordEnabled({}), false);
  assert.equal(isDiscordEnabled({ DISCORD_NOTIFICATIONS_ENABLED: "false" }), false);
  assert.equal(isDiscordEnabled({ DISCORD_NOTIFICATIONS_ENABLED: "true" }), true);
});

test("retry uses exponential delay and honors Discord Retry-After", () => {
  assert.equal(retryDelayMs(1), 15000);
  assert.equal(retryDelayMs(3), 60000);
  assert.equal(retryDelayMs(1, 40000), 40000);
  assert.equal(retryDelayMs(9), 3600000);
});

test("success sends waited webhook and JSON, without any mentions", async () => {
  let seen = false;
  const mock = (async (url: string | URL | Request, init?: RequestInit) => {
    seen = true;
    assert.match(String(url), /wait=true/);
    assert.equal(init?.method, "POST");
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload.allowed_mentions, { parse: [] });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const result = await sendDiscordWebhook(webhook, {
    type: "test", title: "Kiểm tra", description: "Gửi thử",
  }, "https://11local.vn", mock);
  assert.deepEqual(result, { kind: "sent", httpStatus: 200 });
  assert.equal(seen, true);
});

test("429 retries using header, 400 stops, network error never reveals secrets", async () => {
  const event = { type: "test" as const, title: "Test", description: "Hello" };
  const rateLimit = (async () => new Response("{}", { status: 429, headers: { "retry-after": "3" } })) as typeof fetch;
  assert.deepEqual(await sendDiscordWebhook(webhook, event, undefined, rateLimit),
    { kind: "retry", reason: "DISCORD_HTTP_429", httpStatus: 429, retryAfterMs: 3000 });
  const invalid = (async () => new Response("bad request", { status: 400 })) as typeof fetch;
  assert.deepEqual(await sendDiscordWebhook(webhook, event, undefined, invalid),
    { kind: "permanent", reason: "DISCORD_HTTP_400", httpStatus: 400 });
  const down = (async () => { throw new Error("secret=" + webhook); }) as typeof fetch;
  assert.deepEqual(await sendDiscordWebhook(webhook, event, undefined, down),
    { kind: "retry", reason: "DISCORD_NETWORK_ERROR", httpStatus: null });
});
