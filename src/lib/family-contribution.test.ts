import assert from "node:assert/strict";
import {test} from "node:test";
import {optionalDate,parseMemoryContribution} from "./family-contribution.ts";

const id = "550e8400-e29b-41d4-a716-446655440000";
const base = () => ({request_id:id,album:{mode:"new",title:"Gấu đi chơi",description:"",event_date:"2026-11-09"},place:{mode:"none"},milestone:{mode:"none"}});
test("validates new album and optional linked place / milestone",()=>{
 const input={...base(),place:{mode:"new",title:"Công viên",latitude:22.67,longitude:106.25,visited_on:"2026-11-08"},milestone:{mode:"new",title:"Ngày đầu đi chơi",details:"Cả nhà",event_date:"2026-11-08"}};
 const result=parseMemoryContribution(input);
 assert.ok("data" in result);
 if("data" in result) {assert.equal(result.data.album.mode,"new");assert.equal(result.data.place.mode,"new");assert.equal(result.data.milestone.mode,"new");}
});
test("allows reusing existing records",()=>{
 const result=parseMemoryContribution({request_id:id,album:{mode:"existing",id},place:{mode:"existing",id},milestone:{mode:"existing",id}});
 assert.ok("data" in result);
});
test("rejects missing album, invalid coords, empty title and malformed dates",()=>{
 assert.ok("error" in parseMemoryContribution({...base(),album:{mode:"new",title:"",description:""}}));
 assert.ok("error" in parseMemoryContribution({...base(),place:{mode:"new",title:"A",latitude:91,longitude:0}}));
 assert.ok("error" in parseMemoryContribution({...base(),milestone:{mode:"new",title:"A",event_date:"2026-02-30"}}));
 assert.ok("error" in parseMemoryContribution({...base(),request_id:"wrong"}));
 assert.equal(optionalDate("2026-02-30"),undefined);
 assert.equal(optionalDate("2024-02-29"),"2024-02-29");
});
