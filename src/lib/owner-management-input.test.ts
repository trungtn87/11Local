import assert from "node:assert/strict";
import test from "node:test";
import {
  OWNER_FIELDS,parseOwnerEdit,parseOwnerPhotoAction,parseOwnerContentDecision,
} from "./owner-management-input.ts";

test("owner edit allowlist accepts only mutable business fields",()=>{
  assert.deepEqual(OWNER_FIELDS,["summary","description","address","phone",
    "website_url","opening_hours","price_note"]);
  const parsed=parseOwnerEdit({expectedVersion:4,changes:{summary:"  Quán cà phê  ",phone:""}});
  assert.deepEqual(parsed,{expectedVersion:4,changes:{summary:"Quán cà phê",phone:null}});
  for(const field of ["slug","latitude","longitude","category_id","featured_rank",
    "visibility","ownership_status","moderation_status","place_kind","version","id"]){
    assert.throws(()=>parseOwnerEdit({expectedVersion:4,changes:{[field]:"fake"}}),/FIELD_NOT_ALLOWED/);
  }
});
test("owner edit validates versions, url, address, size and empty body",()=>{
  for(const input of [
    {expectedVersion:0,changes:{summary:"ok"}},
    {expectedVersion:"3",changes:{summary:"ok"}},
    {expectedVersion:1,changes:{}},
    {expectedVersion:1,changes:[]},
    {expectedVersion:1,changes:{address:" "}},
    {expectedVersion:1,changes:{address:null}},
    {expectedVersion:1,changes:{phone:500}},
    {expectedVersion:1,changes:{website_url:"javascript:alert(1)"}},
    {expectedVersion:1,changes:{summary:"x".repeat(351)}},
    {expectedVersion:1,changes:{description:"\u0000"}},
  ])assert.throws(()=>parseOwnerEdit(input));
});
test("photo and admin actions have strict validation and reasons",()=>{
  assert.equal(parseOwnerPhotoAction({action:"cover"}),"cover");
  assert.equal(parseOwnerPhotoAction({action:"hide"}),"hide");
  assert.throws(()=>parseOwnerPhotoAction({action:"delete"}),/INVALID_ACTION/);
  assert.deepEqual(parseOwnerContentDecision({action:"approve"}),{action:"approve",note:""});
  assert.throws(()=>parseOwnerContentDecision({action:"reject",note:"No"}),/REASON_REQUIRED/);
  assert.equal(parseOwnerContentDecision({action:"reject",note:" Không chính xác "}).note,
    "Không chính xác");
  assert.throws(()=>parseOwnerContentDecision({action:"publish"}),/INVALID_ACTION/);
});
