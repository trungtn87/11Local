/** Database-free OSM normalizer: produces review candidates only. */
export const CATEGORIES = ["sight","food","cafe","stay","shop","service"];

export function nameKey(text) {
  return String(text ?? "").normalize("NFD").replace(/\p{M}/gu,"")
    .replace(/[đĐ]/g,"d").toLowerCase().replace(/\bca\s+phe\b/g,"cafe")
    .replace(/[^a-z0-9]/g,"");
}
export function distanceMeters(lat1,lng1,lat2,lng2) {
  const rad=n=>n*Math.PI/180;
  const a=Math.sin(rad(lat2-lat1)/2)**2+
    Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lng2-lng1)/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function categoryFor(t={}) {
  const a=t.amenity, v=t.tourism;
  if (["cafe","ice_cream"].includes(a)) return "cafe";
  if (["restaurant","fast_food","food_court","bar","pub"].includes(a)) return "food";
  if (["hotel","guest_house","hostel","motel","apartment","camp_site","chalet","homestay"].includes(v)) return "stay";
  if (["attraction","viewpoint","museum","gallery","artwork","zoo","theme_park"].includes(v) ||
      ["monument","memorial","archaeological_site","ruins","castle","battlefield","wayside_shrine"].includes(t.historic) ||
      ["waterfall","cave_entrance","peak","spring","beach"].includes(t.natural) ||
      ["park","nature_reserve","garden"].includes(t.leisure)) return "sight";
  if (["gift","bakery","convenience","supermarket","mall","general","department_store","clothes","coffee"].includes(t.shop)) return "shop";
  if (["taxi","fuel","atm","bank","pharmacy","hospital","bus_station","car_rental","parking"].includes(a) || v==="information") return "service";
  return null;
}
const take=(tags,...keys)=>keys.map(k=>tags[k]).find(v=>typeof v==="string"&&v.trim())?.trim()??"";
function safeUrl(value) {
  if (!value) return "";
  try { const u=new URL(value); return ["http:","https:"].includes(u.protocol)?u.href:""; }
  catch { return ""; }
}
function addressFrom(t) {
  const full=take(t,"addr:full"); if (full) return full;
  const parts=[t["addr:housenumber"],t["addr:street"]||t["addr:place"],t["addr:suburb"],t["addr:city"]||t["addr:district"]]
    .filter(v=>typeof v==="string"&&v.trim());
  return [...new Set(parts)].join(", ");
}
export function convertElement(el) {
  if (!el || !["node","way","relation"].includes(el.type) || !Number.isSafeInteger(el.id) || el.id<=0) return null;
  const tags=el.tags??{}; if (tags.boundary==="administrative") return null;
  const name=take(tags,"name:vi","name"), categoryId=categoryFor(tags);
  const latitude=el.type==="node"?el.lat:el.center?.lat;
  const longitude=el.type==="node"?el.lon:el.center?.lon;
  if (!name||name.length>160||!categoryId||!Number.isFinite(latitude)||!Number.isFinite(longitude)||
      latitude < -90||latitude>90||longitude < -180||longitude>180) return null;
  const address=addressFrom(tags), area=take(tags,"addr:district","addr:city","addr:province");
  const osmKey=el.type+"/"+el.id;
  const phone=take(tags,"contact:phone","phone");
  const websiteUrl=safeUrl(take(tags,"contact:website","website","url"));
  const facebookUrl=safeUrl(take(tags,"contact:facebook","facebook"));
  const youtubeUrl=safeUrl(take(tags,"contact:youtube","youtube"));
  const openingHours=take(tags,"opening_hours");
  const missingFields=["address","phone","websiteUrl","openingHours"].filter(k=>!({address,phone,websiteUrl,openingHours})[k]);
  const qualityScore=40+(address?25:0)+(phone?15:0)+(websiteUrl?10:0)+(openingHours?10:0);
  return {
    osmKey,osmUrl:"https://www.openstreetmap.org/"+osmKey,name,categoryId,
    placeKind:categoryId==="sight"?"attraction":"business",
    latitude,longitude,address,area,phone,websiteUrl,facebookUrl,youtubeUrl,
    openingHours,qualityScore,missingFields,
    status:address?"ready_for_review":"needs_address",
    duplicateStatus:"none",duplicateWith:"",
    googleMapsSearchUrl:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(name+" Cao Bằng"),
  };
}
function similar(a,b) {
  const n1=nameKey(a.name), n2=nameKey(b.name); if (!n1||!n2) return false;
  const d=distanceMeters(a.latitude,a.longitude,b.latitude,b.longitude);
  return (n1===n2&&d<120)||
    (n1.length>=6&&n2.length>=6&&(n1.includes(n2)||n2.includes(n1))&&d<65);
}
export function processOsm(elements,existingPlaces=[]) {
  if (!Array.isArray(elements)||!Array.isArray(existingPlaces)) throw new Error("INVALID_SOURCE_FORMAT");
  const byOsmKey=new Map(); let filteredOut=0;
  for (const element of elements) {
    const p=convertElement(element); if (!p) {filteredOut++;continue;}
    const current=byOsmKey.get(p.osmKey);
    if (!current||p.qualityScore>current.qualityScore) byOsmKey.set(p.osmKey,p);
  }
  const all=[...byOsmKey.values()].sort((a,b)=>b.qualityScore-a.qualityScore||a.name.localeCompare(b.name,"vi"));
  // Compare only neighboring grid cells: OSM node/way collisions are flagged, not deleted.
  const cells=new Map();
  for (const p of all) {
    const x=Math.floor(p.latitude*100),y=Math.floor(p.longitude*100);
    let dupe=null;
    for(let i=-1;i<=1&&!dupe;i++) for(let j=-1;j<=1&&!dupe;j++)
      for(const other of cells.get((x+i)+":"+(y+j))??[]) {
        if(p.categoryId===other.categoryId&&similar(p,other)){dupe=other;break;}
      }
    if(dupe) {
      p.duplicateStatus="possible_osm_duplicate";p.duplicateWith=dupe.osmKey;p.status="possible_duplicate";
    } else {
      const cell=x+":"+y;cells.set(cell,[...(cells.get(cell)??[]),p]);
    }
  }
  const existingValid=existingPlaces.map(p=>({
    id:String(p.id??p.slug??""),name:String(p.name??""),
    latitude:Number(p.latitude),longitude:Number(p.longitude),
  })).filter(p=>p.id&&p.name&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
  for(const p of all) {
    if(p.duplicateStatus!=="none")continue;
    const match=existingValid.find(e=>similar(p,e));
    if(match){p.duplicateStatus="possible_11local_duplicate";p.duplicateWith=match.id;p.status="possible_duplicate";}
  }
  const categories=Object.fromEntries(CATEGORIES.map(c=>[c,all.filter(p=>p.categoryId===c).length]));
  const statuses=Object.fromEntries(["ready_for_review","needs_address","possible_duplicate"]
    .map(s=>[s,all.filter(p=>p.status===s).length]));
  return {places:all,summary:{
    totalSourceElements:elements.length,validUniqueOsmIds:all.length,
    filteredOut,repeatedOsmIds:elements.length-filteredOut-all.length,
    categories,statuses,comparedExisting:existingValid.length,
  }};
}
export function csvCell(value) {
  const raw=String(value??"");
  // OSM is untrusted: stop spreadsheet formula execution on CSV open.
  const safe=/^[\s\u0000-\u001f]*[=+@-]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
}
export const CSV_COLUMNS=["osmKey","osmUrl","name","categoryId","placeKind",
  "latitude","longitude","address","area","phone","websiteUrl","facebookUrl",
  "youtubeUrl","openingHours","qualityScore","status","duplicateStatus",
  "duplicateWith","googleMapsSearchUrl"];
export function toCsv(rows) {
  return [CSV_COLUMNS.map(csvCell).join(","),...rows.map(r=>CSV_COLUMNS.map(k=>csvCell(r[k])).join(","))].join("\r\n")+"\r\n";
}
export function reportMarkdown(summary,source) {
  const rows=CATEGORIES.map(c=>"| "+c+" | "+summary.categories[c]+" |").join("\n");
  return "# 11Local — OSM Cao Bằng preview (chưa nhập database)\n\n"+
    "- Nguồn: "+source+" (© OpenStreetMap contributors; ODbL).\n"+
    "- Phạm vi: ranh giới hành chính tỉnh Cao Bằng theo dữ liệu OSM, không phải ô chữ nhật.\n"+
    "- Số phần tử OSM trả về: **"+summary.totalSourceElements+"**; địa điểm hợp lệ/OSM ID duy nhất: **"+summary.validUniqueOsmIds+"**.\n"+
    "- Loại khỏi danh sách: **"+summary.filteredOut+"**; ID OSM lặp: **"+summary.repeatedOsmIds+"**.\n"+
    "- So khớp với dữ liệu 11Local đã xuất: **"+summary.comparedExisting+"** bản ghi (0 nghĩa là chưa đối chiếu Neon).\n\n"+
    "## Danh mục\n\n| Danh mục 11Local | Số lượng |\n|---|---:|\n"+rows+"\n\n"+
    "## Hàng chờ kiểm tra\n\n| Trạng thái | Số lượng |\n|---|---:|\n"+
    "| Đủ địa chỉ để kiểm duyệt thủ công | "+summary.statuses.ready_for_review+" |\n"+
    "| Thiếu địa chỉ | "+summary.statuses.needs_address+" |\n"+
    "| Nghi trùng (không tự xóa) | "+summary.statuses.possible_duplicate+" |\n\n"+
    "**Lưu ý:** Chưa kiểm chứng từng địa điểm, chưa thêm vào Neon, chưa công khai trên 11Local. "+
    "Đây là dữ liệu do OSM cung cấp, có thể thiếu hoặc lỗi thời. Liên kết Google Maps chỉ phục vụ đối chiếu thủ công, "+
    "**không phải** điểm sao/lượt đánh giá đã thu thập. Việc ghép Google Places API cần cấu hình và tuân thủ điều khoản riêng; "+
    "không lưu rating hay số đánh giá Google vào CSV này.\n";
}
