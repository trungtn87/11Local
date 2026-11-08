import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const TYPES = {
  album: "family_albums",
  place: "family_places",
  milestone: "family_milestones",
} as const;
type Kind = keyof typeof TYPES;
const validType = (t: unknown): t is Kind => typeof t === "string" && t in TYPES;
const validId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
const date = (value: unknown) => value === "" || value === null || value === undefined ? null :
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;

function validate(body: Record<string, unknown>) {
  if (!validType(body.type)) return {error:"Loại dữ liệu không hợp lệ"} as const;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 150) return {error:"Tên phải có 1–150 ký tự"} as const;
  const eventDate=date(body.event_date), visitedDate=date(body.visited_on);
  if(eventDate===undefined||visitedDate===undefined) return {error:"Ngày không hợp lệ"} as const;
  const albumId=body.album_id === "" || body.album_id === null || body.album_id===undefined ? null:body.album_id;
  if(albumId !== null&&!validId(albumId)) return {error:"Album liên quan không hợp lệ"} as const;
  if(body.type==="milestone"&&!eventDate) return {error:"Cột mốc cần ngày tháng"} as const;
  const lat=Number(body.latitude),lng=Number(body.longitude);
  if(body.type==="place" && (body.latitude===""||body.longitude===""||body.latitude===null||
    body.longitude===null||body.latitude===undefined||body.longitude===undefined||
    !Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180))
    return {error:"Tọa độ không hợp lệ"} as const;
  return {type:body.type,title,eventDate,visitedDate,albumId,
    latitude:lat,longitude:lng,
    description:typeof body.description==="string"?body.description.slice(0,2000):"",
    details:typeof body.details==="string"?body.details.slice(0,4000):""};
}
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
export async function GET(){
  if(!(await isAdmin())) return fail("Không có quyền",401);
  try {
    const [albums,places,milestones]=await Promise.all([
      db().unsafe("SELECT id::text,title,description,event_date::text,archived_at::text,created_at::text,(SELECT count(*)::int FROM family_photos WHERE album_id=family_albums.id) AS photo_count FROM family_albums ORDER BY created_at DESC LIMIT 1000"),
      db().unsafe("SELECT id::text,title,latitude,longitude,visited_on::text,album_id::text FROM family_places ORDER BY created_at DESC LIMIT 1000"),
      db().unsafe("SELECT id::text,title,details,event_date::text,album_id::text FROM family_milestones ORDER BY event_date DESC LIMIT 1000")
    ]);
    return NextResponse.json({albums,places,milestones},{headers:{"Cache-Control":"no-store"}});
  }catch{return fail("Không tải được nội dung quản trị",500);}
}
export async function POST(request:Request){
  if(!(await isAdmin()))return fail("Không có quyền",401);
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=="object"||Array.isArray(input))return fail("Dữ liệu không hợp lệ");
  const data=validate(input);
  if("error" in data)return fail(data.error);
  try{
    if(data.type==="album")await db().unsafe("INSERT INTO family_albums(title,description,event_date) VALUES ($1,$2,$3::date)",[data.title,data.description,data.eventDate]);
    if(data.type==="place")await db().unsafe("INSERT INTO family_places(title,latitude,longitude,visited_on,album_id) VALUES ($1,$2,$3,$4::date,$5::uuid)",[data.title,data.latitude,data.longitude,data.visitedDate,data.albumId]);
    if(data.type==="milestone")await db().unsafe("INSERT INTO family_milestones(title,details,event_date,album_id) VALUES ($1,$2,$3::date,$4::uuid)",[data.title,data.details,data.eventDate,data.albumId]);
    return NextResponse.json({ok:true},{status:201});
  }catch{return fail("Không thể tạo nội dung; kiểm tra album liên quan",400);}
}
export async function PATCH(request:Request){
  if(!(await isAdmin()))return fail("Không có quyền",401);
  const body=await request.json().catch(()=>null);
  if(!body||!validType(body.type)||!validId(body.id))return fail("Loại hoặc ID không hợp lệ");
  try{
    if(body.type==="album"&&typeof body.restore==="boolean"){
      const rows=await db().unsafe("UPDATE family_albums SET archived_at=$1 WHERE id::text=$2 RETURNING id",[body.restore?null:new Date(),body.id]);
      return rows.length?NextResponse.json({ok:true}):fail("Không tìm thấy album",404);
    }
    const data=validate(body);
    if("error" in data)return fail(data.error);
    let rows;
    if(data.type==="album")rows=await db().unsafe("UPDATE family_albums SET title=$1,description=$2,event_date=$3::date WHERE id::text=$4 RETURNING id",[data.title,data.description,data.eventDate,body.id]);
    else if(data.type==="place")rows=await db().unsafe("UPDATE family_places SET title=$1,latitude=$2,longitude=$3,visited_on=$4::date,album_id=$5::uuid WHERE id::text=$6 RETURNING id",[data.title,data.latitude,data.longitude,data.visitedDate,data.albumId,body.id]);
    else rows=await db().unsafe("UPDATE family_milestones SET title=$1,details=$2,event_date=$3::date,album_id=$4::uuid WHERE id::text=$5 RETURNING id",[data.title,data.details,data.eventDate,data.albumId,body.id]);
    return rows.length?NextResponse.json({ok:true}):fail("Không tìm thấy nội dung",404);
  }catch{return fail("Không thể cập nhật nội dung",400);}
}
export async function DELETE(request:Request){
  if(!(await isAdmin()))return fail("Không có quyền",401);
  const body=await request.json().catch(()=>null);
  if(!body||!validType(body.type)||!validId(body.id))return fail("Loại hoặc ID không hợp lệ");
  try {
    // Albums are archived rather than deleted; preserve every family photo.
    const rows=body.type==="album"
      ?await db().unsafe("UPDATE family_albums SET archived_at=now() WHERE id::text=$1 AND archived_at IS NULL RETURNING id",[body.id])
      :await db().unsafe("DELETE FROM "+TYPES[body.type]+" WHERE id::text=$1 RETURNING id",[body.id]);
    return rows.length?NextResponse.json({ok:true}):fail("Không tìm thấy nội dung",404);
  }catch{return fail("Không thể xóa nội dung",400);}
}
