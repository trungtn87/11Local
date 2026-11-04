
import assert from "node:assert/strict";
import {test} from "node:test";
import {parseExistingFeedback,parseContributorReply} from "./contribution-existing.ts";
const placeId="91affade-8c49-4e46-a8fb-d2e58eb8aa9e";
const report={kind:"report",placeId,reason:"wrong_location",note:"Ghim vị trí đang lệch khoảng 200 mét."};
test("report: accepted with public place uuid and reason",()=>{
  const value=parseExistingFeedback(report);
  assert.equal(value.kind,"report");
  assert.equal(value.fieldKey,null);
});
test("report: rejects invalid ids, reasons and short notes",()=>{
  assert.throws(()=>parseExistingFeedback({...report,placeId:"not-an-id"}),/INVALID_PLACE/);
  assert.throws(()=>parseExistingFeedback({...report,reason:"unknown"}),/INVALID_REASON/);
  assert.throws(()=>parseExistingFeedback({...report,note:"Ngắn"}),/INVALID_NOTE/);
});
test("edit: only one supported field and safe values",()=>{
  const raw={kind:"edit_place",placeId,note:"Cập nhật theo biển hiệu tại quán.",fieldKey:"phone",proposedValue:"0206 888 999"};
  assert.equal(parseExistingFeedback(raw).proposedValue,"0206 888 999");
  assert.throws(()=>parseExistingFeedback({...raw,fieldKey:"moderation_status"}),/INVALID_FIELD/);
  assert.throws(()=>parseExistingFeedback({...raw,proposedValue:"<script>"}),/INVALID_PHONE/);
  assert.throws(()=>parseExistingFeedback({...raw,fieldKey:"website_url",proposedValue:"javascript:alert(1)"}),/INVALID_WEBSITE_URL/);
  assert.throws(()=>parseExistingFeedback({...raw,fieldKey:"name",proposedValue:""}),/INVALID_VALUE/);
});
test("photo: supports optional note, strips untrusted proposed fields",()=>{
  const value=parseExistingFeedback({kind:"photo",placeId,note:"",fieldKey:"name",proposedValue:"Fake"});
  assert.equal(value.fieldKey,null);
  assert.equal(value.proposedValue,null);
});
test("reply: enforce message and optimistic version",()=>{
  assert.deepEqual(parseContributorReply({message:" Có ảnh mới. ",expectedVersion:2}),
    {message:"Có ảnh mới.",expectedVersion:2});
  assert.throws(()=>parseContributorReply({message:"ok",expectedVersion:2}),/INVALID_MESSAGE/);
  assert.throws(()=>parseContributorReply({message:"Bổ sung",expectedVersion:0}),/INVALID_VERSION/);
  assert.throws(()=>parseContributorReply({message:"Bổ sung",expectedVersion:1.5}),/INVALID_VERSION/);
});
