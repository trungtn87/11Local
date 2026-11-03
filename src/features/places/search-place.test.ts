import assert from "node:assert/strict";
import test from "node:test";
import { filterRealPlaces, foldSearch } from "./search-place.ts";
import type { PublicPlace } from "./public-place.ts";

const place = (partial: Partial<PublicPlace>): PublicPlace => ({
  id:"1",slug:"pac-bo",name:"Pác Bó",description:"Suối Lê-nin",
  category_id:"sight",category_name:"Tham quan",area:"Hà Quảng",
  address:"Trường Hà",latitude:22.98,longitude:106.18,
  ownership_status:"unverified",phone:null,...partial,
});
const items = [place({}), place({id:"2",slug:"ban-gioc",name:"Thác Bản Giốc",area:"Trùng Khánh",latitude:22.85,longitude:106.73})];
const filters = {q:"",cat:"all",area:"all",verifiedOnly:false,sort:"relevance"};

test("Vietnamese search ignores tone and matches real descriptive fields",()=>{
  assert.equal(foldSearch("PẮC BÓ"),"pac bo");
  assert.deepEqual(filterRealPlaces(items,{...filters,q:"ban gioc"},null).map(p=>p.id),["2"]);
  assert.deepEqual(filterRealPlaces(items,{...filters,q:"suoi le-nin"},null).map(p=>p.id),["1"]);
});
test("category area and verified filters only use stored values",()=>{
  assert.deepEqual(filterRealPlaces(items,{...filters,cat:"sight",area:"Hà Quảng"},null).map(p=>p.id),["1"]);
  assert.equal(filterRealPlaces(items,{...filters,verifiedOnly:true},null).length,0);
});
test("nearest uses real coordinates; no simulated distances",()=>{
  assert.deepEqual(filterRealPlaces(items,{...filters,sort:"nearest"},{latitude:22.85,longitude:106.73}).map(p=>p.id),["2","1"]);
});
