import assert from "node:assert/strict";
import test from "node:test";
import { haversineMeters, normalizeSlug, parsePlaceInput } from "./place-input.ts";
test("normalizes Vietnamese names into stable slugs",()=>assert.equal(normalizeSlug("  Phở Chua Cô Đào  "),"pho-chua-co-dao"));
test("rejects coordinates outside the earth",()=>assert.throws(()=>parsePlaceInput({name:"A",categoryId:"food",address:"B",area:"C",latitude:91,longitude:106}),/INVALID_LATITUDE/));
test("new places always parse explicit server fields",()=>{const value=parsePlaceInput({name:"Quán thật",categoryId:"cafe",address:"1 Kim Đồng",area:"TP. Cao Bằng",latitude:22.67,longitude:106.25});assert.equal(value.visibility,"visible");assert.equal(value.slug,"quan-that");});
test("duplicate distance helper is approximately correct",()=>assert.ok(haversineMeters(22.666,106.25,22.667,106.25)>100));
