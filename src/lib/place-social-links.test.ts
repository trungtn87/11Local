import assert from "node:assert/strict";
import test from "node:test";
import {isSocialUrl,parseSocialUrl,safeSocialUrl} from "./place-social-links.ts";
import {submissionHash} from "./contribution-limit.ts";

test("Facebook and YouTube accept their own http(s) domain only",()=>{
  assert.equal(parseSocialUrl(" https://www.facebook.com/caobang ", "facebook"),"https://www.facebook.com/caobang");
  assert.equal(parseSocialUrl("https://youtu.be/123", "youtube"),"https://youtu.be/123");
  assert.equal(parseSocialUrl("", "facebook"),null);
  for(const url of ["javascript:alert(1)","https://facebook.com.evil.test/page",
    "https://www.youtube.com.evil.test/video","https://username:pass@facebook.com/page"]){
    assert.equal(isSocialUrl(url,"facebook"),false);
    assert.equal(isSocialUrl(url,"youtube"),false);
  }
  assert.throws(()=>parseSocialUrl("https://youtube.com/@a","facebook"),/INVALID_FACEBOOK_URL/);
  assert.throws(()=>parseSocialUrl("https://facebook.com/page","youtube"),/INVALID_YOUTUBE_URL/);
  assert.equal(safeSocialUrl("https://facebook.com.invalid/x","facebook"),null);
});

test("30-second duplicate keys are stable for same content and vary with photos",()=>{
  const body={name:"Quán cà phê",latitude:22.7};
  const first=submissionHash("new_place",body,[Buffer.from("photo1")]);
  assert.equal(first,submissionHash("new_place",body,[Buffer.from("photo1")]));
  assert.notEqual(first,submissionHash("new_place",body,[Buffer.from("photo2")]));
  assert.notEqual(first,submissionHash("existing",body,[Buffer.from("photo1")]));
});
