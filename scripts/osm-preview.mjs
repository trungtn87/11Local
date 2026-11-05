#!/usr/bin/env node
/** Read-only data collector: never connects to any 11Local database. */
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {processOsm,reportMarkdown,toCsv} from "./osm-preview-core.mjs";

const OSM_QUERY=[
  "[out:json][timeout:180];",
  "(",
  ' rel["boundary"="administrative"]["admin_level"="4"]["name"~"^Cao Bằng$|^Cao Bang$",i];',
  ' rel["boundary"="administrative"]["ISO3166-2"="VN-04"];',
  ")->.province;",
  ".province out tags;",
  ".province map_to_area->.cao_bang;",
  "(",
  ' nwr(area.cao_bang)["amenity"~"^(restaurant|fast_food|food_court|bar|pub|cafe|ice_cream|taxi|fuel|atm|bank|pharmacy|hospital|bus_station|car_rental|parking)$"];',
  ' nwr(area.cao_bang)["tourism"~"^(attraction|viewpoint|museum|gallery|artwork|zoo|theme_park|hotel|guest_house|hostel|motel|apartment|camp_site|chalet|homestay|information)$"];',
  ' nwr(area.cao_bang)["historic"~"^(monument|memorial|archaeological_site|ruins|castle|battlefield|wayside_shrine)$"];',
  ' nwr(area.cao_bang)["natural"~"^(waterfall|cave_entrance|peak|spring|beach)$"];',
  ' nwr(area.cao_bang)["leisure"~"^(park|nature_reserve|garden)$"];',
  ' nwr(area.cao_bang)["shop"~"^(gift|bakery|convenience|supermarket|mall|general|department_store|clothes|coffee)$"];',
  ");",
  "out center;",
].join("\n");
const ENDPOINTS=[
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
function options(argv) {
  const opts={input:"",existing:"",outDir:"tmp/osm-preview"};
  for(let i=0;i<argv.length;i++) {
    const key=argv[i];
    if(!["--input","--existing","--out-dir"].includes(key)||!argv[i+1])
      throw new Error("Unknown/missing option: "+key);
    opts[key.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=argv[++i];
  }
  return opts;
}
async function downloadOverpass() {
  const failures=[];
  for(const url of ENDPOINTS) {
    try {
      const body=new URLSearchParams({data:OSM_QUERY});
      const response=await fetch(url,{
        method:"POST",
        headers:{
          "content-type":"application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent":"11Local-OSM-Preview/1.0 (admin review; no DB writes)",
        },
        body,signal:AbortSignal.timeout(205000),
      });
      if(!response.ok)throw new Error("HTTP "+response.status);
      const payload=await response.json();
      if(!Array.isArray(payload.elements))throw new Error("Missing Overpass elements");
      if(!payload.elements.some(el=>el.type==="relation"&&el.tags?.boundary==="administrative"&&el.tags?.admin_level==="4"))
        throw new Error("Cannot verify Cao Bằng provincial boundary: abort preview");
      return {payload,source:url};
    } catch(error) {failures.push(url+": "+error.message);}
  }
  throw new Error("All Overpass mirrors failed; no output generated.\n"+failures.join("\n"));
}
async function main() {
  const opts=options(process.argv.slice(2));
  const {payload,source}=opts.input
    ? {payload:JSON.parse(await readFile(resolve(opts.input),"utf8")),source:"OSM Overpass JSON file "+opts.input}
    : await downloadOverpass();
  if(!Array.isArray(payload.elements)) throw new Error("Invalid Overpass JSON: elements array required");
  const existing=opts.existing?JSON.parse(await readFile(resolve(opts.existing),"utf8")):[];
  const existingRows=Array.isArray(existing)?existing:existing.places;
  if(!Array.isArray(existingRows))throw new Error("Existing export must be an array or {places:[]}");
  const result=processOsm(payload.elements,existingRows);
  if(!result.places.length)throw new Error("No candidate places found; refusing to generate misleading empty report");
  const dir=resolve(opts.outDir);
  await mkdir(dir,{recursive:true});
  await Promise.all([
    writeFile(resolve(dir,"candidates.json"),JSON.stringify({
      source,license:"ODbL-1.0; © OpenStreetMap contributors",...result,
    },null,2)+"\n"),
    writeFile(resolve(dir,"candidates.csv"),toCsv(result.places)),
    writeFile(resolve(dir,"report.md"),reportMarkdown(result.summary,source)),
  ]);
  console.log("OSM preview only: "+result.summary.validUniqueOsmIds+" candidates => "+dir);
  console.log(result.summary);
  console.log("NO DATABASE READ OR WRITE performed by this tool.");
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
