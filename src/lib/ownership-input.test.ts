import assert from "node:assert/strict";
import test from "node:test";
import {isUuid,parseClaimInput,parseClaimReply,parseClaimDecision,
  parseManagerDecision,canReview,isActiveManager,sameOrigin} from "./ownership-input.ts";
const id="ce08d537-c313-4c93-bc66-bd7a27be2544";
const user="fcc6c221-18c8-49d5-b17f-abd2fbb642f1";

test("claims require a real UUID, name, VN contact phone, relationship and statement",()=>{
  assert.deepEqual(parseClaimInput({placeId:id,claimantName:" Nguyễn Văn A ",contactPhone:"0912 345 678",
    relationship:"owner",statement:"Tôi đang kinh doanh tại địa điểm này."}),{
    placeId:id,claimantName:"Nguyễn Văn A",contactPhone:"0912345678",
    relationship:"owner",statement:"Tôi đang kinh doanh tại địa điểm này."});
  for(const changes of [{placeId:"p1"},{contactPhone:"+84912"},{relationship:"admin"},
    {statement:"short"},{claimantName:"X"},{statement:"x".repeat(2001)}]){
    assert.throws(()=>parseClaimInput({placeId:id,claimantName:"Chủ quán",contactPhone:"0912345678",
      relationship:"owner",statement:"Tôi đang kinh doanh tại địa điểm này.",...changes}),/INVALID_/);
  }
});
test("decisions demand optimistic versions and proof of manual verification",()=>{
  assert.deepEqual(parseClaimDecision({action:"approve",expectedVersion:1,reviewMethod:"Đã gọi điện"}),
    {action:"approve",expectedVersion:1,note:"",reviewMethod:"Đã gọi điện"});
  for(const value of [{action:"approve",expectedVersion:1},
    {action:"reject",expectedVersion:1,note:"sai"},
    {action:"dispute",expectedVersion:1},
    {action:"ban",expectedVersion:1},
    {action:"approve",expectedVersion:0,reviewMethod:"Đã gọi điện"}]){
    assert.throws(()=>parseClaimDecision(value));
  }
  assert.equal(canReview("pending"),true);
  assert.equal(canReview("disputed"),true);
  assert.equal(canReview("approved"),false);
  assert.equal(canReview("rejected"),false);
});
test("replies and manager actions require version, role and recorded reason",()=>{
  assert.equal(parseClaimReply({message:"  Tôi bổ sung thông tin  ",expectedVersion:2}).message,
    "Tôi bổ sung thông tin");
  assert.throws(()=>parseClaimReply({message:"ok",expectedVersion:2}),/INVALID_MESSAGE/);
  assert.deepEqual(parseManagerDecision({action:"suspend",userId:user,expectedVersion:3,note:"Có tranh chấp"}),
    {action:"suspend",userId:user,expectedVersion:3,note:"Có tranh chấp"});
  assert.throws(()=>parseManagerDecision({action:"suspend",userId:user,note:"Có tranh chấp"}),/INVALID_VERSION/);
  assert.throws(()=>parseManagerDecision({action:"grant_owner",userId:user,note:"Có tranh chấp"}),/INVALID_ACTION/);
  assert.equal(isActiveManager("owner","active"),true);
  assert.equal(isActiveManager("manager","revoked"),false);
  assert.equal(isActiveManager("admin","active"),false);
});
test("origin and UUID guards reject cross-site requests",()=>{
  assert.equal(isUuid(id),true);
  assert.equal(isUuid("../admin"),false);
  assert.equal(sameOrigin(new Request("https://11local.vn/api/ownership-claims",
    {headers:{origin:"https://evil.example"}})),false);
  assert.equal(sameOrigin(new Request("https://11local.vn/api/ownership-claims",
    {headers:{origin:"https://11local.vn"}})),true);
});
