import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDiscordBusinessEvent, enqueueBusinessDiscordInTx } from "./discord-business-events.ts";

const ID = "91affade-8c49-4e46-a8fb-d2e58eb8aa9e";

test("business event catalog emits stable keys, correct links and no user text", () => {
  const a = buildDiscordBusinessEvent("contribution.new_place", ID, 1);
  assert.equal(a.eventKey, `contribution.new_place:${ID}:1`);
  assert.equal(a.event.type, "contribution");
  assert.equal(a.event.actionPath, "/admin/dong-gop");
  assert.equal(a.event.description.includes("Mã hồ sơ: " + ID), true);
  assert.deepEqual(a, buildDiscordBusinessEvent("contribution.new_place", ID, 1));
  assert.notEqual(a.eventKey, buildDiscordBusinessEvent("contribution.reply", ID, 2).eventKey);
});

test("moderation actions have different deduplication keys", () => {
  const approved = buildDiscordBusinessEvent("moderation.ownership.approved", ID, 3);
  const rejected = buildDiscordBusinessEvent("moderation.ownership.rejected", ID, 3);
  assert.notEqual(approved.eventKey, rejected.eventKey);
  assert.equal(approved.event.type, "ownership");
  assert.equal(approved.event.actionPath, "/admin/xac-minh");
});

test("rejects invalid event identities and revisions", () => {
  assert.throws(() => buildDiscordBusinessEvent("review.created", "../admin"), /INVALID_BUSINESS_ID/);
  assert.throws(() => buildDiscordBusinessEvent("review.created", ID, 0), /INVALID_BUSINESS_REVISION/);
  assert.throws(() => buildDiscordBusinessEvent("review.created", ID, "oops?query"), /INVALID_BUSINESS_REVISION/);
});

test("disabled notifications do not even touch the transaction", async () => {
  const previous = process.env.DISCORD_NOTIFICATIONS_ENABLED;
  try {
    process.env.DISCORD_NOTIFICATIONS_ENABLED = "false";
    await enqueueBusinessDiscordInTx(
      (() => { throw new Error("should not query"); }) as never,
      "review.created", ID,
    );
  } finally {
    if (previous === undefined) delete process.env.DISCORD_NOTIFICATIONS_ENABLED;
    else process.env.DISCORD_NOTIFICATIONS_ENABLED = previous;
  }
});

test("enabled notifications write only to supplied transaction, not Discord HTTP", async () => {
  const previous = process.env.DISCORD_NOTIFICATIONS_ENABLED;
  try {
    process.env.DISCORD_NOTIFICATIONS_ENABLED = "true";
    let seen = "";
    let args: unknown[] = [];
    const fakeTx = ((template: TemplateStringsArray, ...values: unknown[]) => {
      seen = template.join("?");
      args = values;
      return Promise.resolve([]);
    }) as never;
    await enqueueBusinessDiscordInTx(fakeTx, "ownership.claimed", ID, 2);
    assert.match(seen, /INSERT INTO public\.discord_notification_outbox/);
    assert.match(seen, /ON CONFLICT \(event_key\) DO NOTHING/);
    assert.equal(args[0], `ownership.claimed:${ID}:2`);
    assert.equal(args[1], "ownership");
    assert.equal(args[2], "ownership");
    assert.equal(args[5], "/admin/xac-minh");
  } finally {
    if (previous === undefined) delete process.env.DISCORD_NOTIFICATIONS_ENABLED;
    else process.env.DISCORD_NOTIFICATIONS_ENABLED = previous;
  }
});


test("group mapping separates reviews, ownership, moderation and contributions", () => {
  assert.equal(buildDiscordBusinessEvent("review.created", ID).group, "review");
  assert.equal(buildDiscordBusinessEvent("owner.photo", ID).group, "contribution");
  assert.equal(buildDiscordBusinessEvent("moderation.review.approved", ID).group, "moderation");
  assert.equal(buildDiscordBusinessEvent("moderation.ownership.approved", ID).group, "ownership");
});
