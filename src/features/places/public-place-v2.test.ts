import assert from "node:assert/strict";
import test from "node:test";
import { selectExplorePlaces, selectHotPlaces, type PublicPlace } from "./public-place.ts";
import { formatFact, formatHours, formatPrice, ownershipMessage, safeUrl } from "./public-place-format.ts";
import { getGoogleMapsDirectionsUrl } from "./google-maps.ts";
const base: PublicPlace = {
  id: "id", slug: "slug", name: "Địa điểm", description: "", address: "",
  area: "Cao Bằng", latitude: 22.6, longitude: 106.2, category_id: "sight",
  category_name: "Tham quan", ownership_status: "unverified", phone: null,
};
test("featured_rank from Neon ranks only active features", () => {
  const places = [
    {...base,id:"latest",updated_at:"2026-11-04T00:00:00Z"},
    {...base,id:"featured",featured_rank:1},
    {...base,id:"expired",featured_rank:0,updated_at:"2026-01-01"},
    {...base,id:"past",featured_rank:2,featured_until:"2026-01-01T00:00:00Z",updated_at:"2025-01-01"},
  ];
  assert.deepEqual(selectExplorePlaces(places,4,Date.parse("2026-11-04T08:00:00Z")).map(p=>p.id),
    ["featured","latest","expired","past"]);
});
test("hot requires real metrics, avoids fictitious cards", () => {
  assert.deepEqual(selectHotPlaces([base]),[]);
  // V1 Hot ranking uses valid detail views from the last 30 days, not
  // historical views alone.
  assert.deepEqual(selectHotPlaces([{...base,id:"old",view_count:10},base]), []);
  assert.equal(selectHotPlaces([{...base,id:"popular",view_count:10,views_30d:10},base])[0].id,"popular");
});
test("handles false, zero, multi-select and blocks javascript URLs", () => {
  assert.equal(formatFact({label:"Bãi xe",field_type:"boolean",value:false})?.text,"Không");
  assert.equal(formatFact({label:"Giá",field_type:"number",value:0})?.text,"0");
  assert.equal(formatFact({label:"Tiện nghi",field_type:"multi_select",value:["Wifi","Đỗ xe"]})?.text,"Wifi · Đỗ xe");
  assert.equal(safeUrl("javascript:alert(1)"),null);
});
test("formats actual timetable and prices without guessing missing values", () => {
  assert.deepEqual(formatHours([{day_of_week:1,slot_index:1,opens_at:"08:00:00",closes_at:"17:00:00",is_closed:false,is_24_hours:false}]),["Thứ hai: 08:00–17:00"]);
  assert.match(formatPrice({label:"Vé",amount_min:0,amount_max:null,currency:"VND",unit:"người",note:null}),/0 đ/);
});
test("only business listings have owner-verification claim", () => {
  assert.equal(ownershipMessage("attraction","unverified"),null);
  assert.equal(ownershipMessage("business","unverified"),"Chưa xác minh chủ địa điểm");
});
test("Google directions prefers approved navigation point",()=>{
  assert.match(getGoogleMapsDirectionsUrl({...base,navigation_latitude:23,navigation_longitude:107}),/23%2C107/);
  assert.match(getGoogleMapsDirectionsUrl({...base,navigation_latitude:23,navigation_longitude:null}),/22.6%2C106.2/);
});
