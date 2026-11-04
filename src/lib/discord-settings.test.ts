import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DISCORD_GROUP_SETTINGS,
  DISCORD_GROUPS,
  fallbackDiscordGroup,
  parseDiscordSettingsUpdate,
} from "./discord-settings.ts";

test("Admin preferences require optimistic version and exact boolean keys", () => {
  const valid = { enabled: true, version: 3, groups: { ...DEFAULT_DISCORD_GROUP_SETTINGS } };
  assert.deepEqual(parseDiscordSettingsUpdate(valid), valid);
  assert.equal(DISCORD_GROUPS.length, 5);
  assert.throws(() => parseDiscordSettingsUpdate({ ...valid, version: 0 }), /INVALID_VERSION/);
  assert.throws(() => parseDiscordSettingsUpdate({ ...valid, enabled: "true" }), /INVALID_SETTINGS/);
  assert.throws(() => parseDiscordSettingsUpdate({ ...valid, groups: { ...valid.groups, review: "yes" } }), /INVALID_GROUPS/);
  assert.throws(() => parseDiscordSettingsUpdate({ ...valid, groups: { ...valid.groups, secret: "oops" } }), /INVALID_GROUPS/);
  assert.throws(() => parseDiscordSettingsUpdate({ ...valid, groups: {} }), /INVALID_GROUPS/);
  assert.throws(() => parseDiscordSettingsUpdate({ ...valid, groups: { ...valid.groups, digest: true } }), /INVALID_GROUPS/);
});

test("legacy outbox rows map safely without confusing reviews with other groups", () => {
  assert.equal(fallbackDiscordGroup("contribution", "review"), "review");
  assert.equal(fallbackDiscordGroup("contribution", null), "contribution");
  assert.equal(fallbackDiscordGroup("ownership", null), "ownership");
  assert.equal(fallbackDiscordGroup("test", null), "test");
  assert.equal(fallbackDiscordGroup("digest", null), "legacy");
  assert.equal(fallbackDiscordGroup("something-else", "../../x"), "contribution");
});
