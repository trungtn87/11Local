import assert from "node:assert/strict";
import test from "node:test";
import { parsePlaceVideoLink, publicVideoEmbed } from "./place-video-links.ts";

test("YouTube watch, share and shorts point to same video", () => {
  const a = parsePlaceVideoLink("https://youtu.be/M7lc1UVf-VE?si=abc");
  const b = parsePlaceVideoLink("https://www.youtube.com/shorts/M7lc1UVf-VE");
  assert.equal(a.normalizedKey, b.normalizedKey);
  assert.equal(a.embedUrl, "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE");
});
test("TikTok video and short links", () => {
  const v = parsePlaceVideoLink("https://www.tiktok.com/@demo/video/6718335390845095173?is_from_webapp=1");
  assert.equal(v.normalizedKey, "tiktok:6718335390845095173");
  assert.equal(v.embedUrl, "https://www.tiktok.com/player/v1/6718335390845095173");
  assert.equal(parsePlaceVideoLink("https://vt.tiktok.com/ZSJabcde/").embedUrl, null);
});
test("Facebook video and post use distinct official plugins", () => {
  assert.match(parsePlaceVideoLink("https://www.facebook.com/reel/123456").embedUrl!, /plugins\/video\.php/);
  assert.match(parsePlaceVideoLink("https://www.facebook.com/page/posts/123456").embedUrl!, /plugins\/post\.php/);
});
test("untrusted URL and unsupported links never become iframe sources", () => {
  for (const url of ["javascript:alert(1)", "https://facebook.com.evil.test/videos/123",
    "https://user:pass@youtube.com/watch?v=M7lc1UVf-VE", "http://youtube.com/watch?v=M7lc1UVf-VE",
    "https://www.youtube.com/channel/UC123", "https://www.tiktok.com/@abc",
    "https://fb.watch.evil.test/a"]) {
    assert.equal(publicVideoEmbed(url), null, url);
  }
});
