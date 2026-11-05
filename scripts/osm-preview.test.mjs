import test from "node:test";
import assert from "node:assert/strict";
import {categoryFor,convertElement,processOsm,nameKey,csvCell,toCsv,reportMarkdown} from "./osm-preview-core.mjs";

const node=(id,name,lat=22.666,lng=106.26,tags={})=>({
  type:"node",id,lat,lon:lng,tags:{name,amenity:"cafe",...tags},
});
test("classifies into the six existing 11Local category IDs",()=>{
  assert.equal(categoryFor({amenity:"restaurant"}),"food");
  assert.equal(categoryFor({amenity:"cafe"}),"cafe");
  assert.equal(categoryFor({tourism:"guest_house"}),"stay");
  assert.equal(categoryFor({natural:"waterfall"}),"sight");
  assert.equal(categoryFor({shop:"gift"}),"shop");
  assert.equal(categoryFor({amenity:"taxi"}),"service");
  assert.equal(categoryFor({highway:"residential"}),null);
});
test("uses way center and OSM-sourced addresses only",()=>{
  const p=convertElement({type:"way",id:123,center:{lat:22.7,lon:106.2},
    tags:{name:"Một homestay",tourism:"guest_house","addr:street":"Phố Kim Đồng","addr:city":"Cao Bằng"}});
  assert.equal(p.categoryId,"stay");
  assert.equal(p.address,"Phố Kim Đồng, Cao Bằng");
  assert.equal(p.osmKey,"way/123");
  assert.equal(p.status,"ready_for_review");
  const n=convertElement(node(5,"Quán không có địa chỉ"));
  assert.equal(n.address,"");
  assert.equal(n.status,"needs_address");
});
test("drops nameless, invalid location, unrelated and administrative records",()=>{
  assert.equal(convertElement(node(1,"")),null);
  assert.equal(convertElement(node(2,"Bad",999)),null);
  assert.equal(convertElement({type:"node",id:3,lat:22,lon:106,tags:{name:"Đường A",highway:"residential"}}),null);
  assert.equal(convertElement({type:"relation",id:4,tags:{name:"Cao Bằng",boundary:"administrative",admin_level:"4"}}),null);
});
test("flags OSM geometry duplicates and 11Local matches independently",()=>{
  const elements=[
    node(1,"Cà phê Phố Cũ",22.666,106.26,{"addr:street":"Kim Đồng"}),
    {type:"way",id:2,center:{lat:22.6661,lon:106.2601},tags:{name:"Cafe Pho Cu",amenity:"cafe"}},
    node(3,"Phở Tiến",22.67,106.25,{"addr:street":"Hồng Việt",amenity:"restaurant"}),
  ];
  const {places,summary}=processOsm(elements,[{id:"real-id",name:"Pho Tien",latitude:22.6701,longitude:106.2502}]);
  assert.equal(summary.validUniqueOsmIds,3);
  assert.equal(places.find(p=>p.osmKey==="way/2").duplicateStatus,"possible_osm_duplicate");
  assert.equal(places.find(p=>p.osmKey==="node/3").duplicateStatus,"possible_11local_duplicate");
  assert.equal(summary.statuses.possible_duplicate,2);
  assert.equal(nameKey("Thác Bản Giốc"),"thacbangioc");
});
test("does not merge separate locations merely because their names match",()=>{
  const r=processOsm([node(1,"Quán Cà phê",22.66,106.26),node(2,"Quán Cà phê",22.7,106.26)]);
  assert.equal(r.summary.statuses.possible_duplicate,0);
});
test("CSV escapes injected formulas and Google link is a manual search only",()=>{
  assert.equal(csvCell('=IMPORTXML("x")'),'"\'=IMPORTXML(""x"")"');
  const p=convertElement(node(4,"Quán Test",22.66,106.26,{phone:"+8499999"}));
  assert.ok(p.googleMapsSearchUrl.startsWith("https://www.google.com/maps/search/?api=1&query="));
  assert.ok(toCsv([p]).includes("'+8499999"));
  const report=reportMarkdown(processOsm([node(4,"Quán Test")]).summary,"fixture");
  assert.match(report,/chưa nhập database/i);
});
