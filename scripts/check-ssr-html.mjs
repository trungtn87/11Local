import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
const port=43927,origin="http://127.0.0.1:"+port;
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--port",String(port)],{env:{...process.env,DATABASE_URL:""},stdio:["ignore","pipe","pipe"]});
let logs="";child.stdout.on("data",x=>logs+=String(x));child.stderr.on("data",x=>logs+=String(x));
async function get(path){for(let i=0;i<35;i++){try{const r=await fetch(origin+path,{signal:AbortSignal.timeout(4000)});if(r.status!==200)throw new Error(path+" HTTP "+r.status);return await r.text();}catch(e){if(i===34)throw e;await sleep(250);}}}
try{const login=await get("/dang-nhap");assert.match(login,/Gia đình Gấu/);assert.match(login,/Google/);const legal=await get("/chinh-sach-bao-mat");assert.match(legal,/Chính sách bảo mật/);const robots=await get("/robots.txt");assert.match(robots,/sitemap.xml/);const monitor=await fetch(origin+"/api/monitor/resources");assert.equal(monitor.status,200);const json=await monitor.json();assert.equal(json.schema,1);assert.equal(json.service,"11local");const session=await fetch(origin+"/api/auth/session");assert.equal(session.status,200);assert.equal((await session.json()).authenticated,false);const gone=await fetch(origin+"/dia-diem/legacy");assert.equal(gone.status,404);console.log("Gia đình Gấu smoke PASS: login, privacy, robots, monitor, guest session, old route 404");}catch(e){console.error(e,logs.slice(-2000));process.exitCode=1;}finally{child.kill("SIGTERM");}
