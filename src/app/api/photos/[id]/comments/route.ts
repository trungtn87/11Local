import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isUuid} from "@/lib/family-contribution";

const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!isUuid(id))return fail("Ảnh không hợp lệ",400);
  const sql=db();
  const photos=await sql.unsafe("SELECT p.id FROM family_photos p JOIN family_albums a ON a.id=p.album_id WHERE p.id::text=$1 AND p.status='approved' AND a.archived_at IS NULL",[id]);
  if(!photos.length)return fail("Không tìm thấy ảnh",404);
  const rows=await sql.unsafe(
    `SELECT c.id::text,c.body,c.created_at::text,c.user_id::text AS author_id,
       COALESCE(u.display_name,'Thành viên gia đình') AS author_name
       FROM family_photo_comments c LEFT JOIN users u ON u.id=c.user_id
       WHERE c.photo_id::text=$1 ORDER BY c.created_at ASC,c.id ASC LIMIT 500`,[id]
  );
  return NextResponse.json({comments:rows},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await getCurrentUser();
  if(!user)return fail("Cần tài khoản Google được duyệt để bình luận",401);
  const {id}=await params;
  if(!isUuid(id))return fail("Ảnh không hợp lệ",400);
  let data:unknown;
  try{data=await request.json();}catch{return fail("Dữ liệu không hợp lệ",400);}
  const body=typeof data==="object"&&data!==null&&!Array.isArray(data) && typeof (data as {body?:unknown}).body==="string"
    ? (data as {body:string}).body.trim() : "";
  if(!body||body.length>2000)return fail("Bình luận phải từ 1 đến 2000 ký tự",400);
  const sql=db();
  const rows=await sql.unsafe(
    `INSERT INTO family_photo_comments(photo_id,user_id,body)
       SELECT p.id,$2::uuid,$3 FROM family_photos p
       JOIN family_albums a ON a.id=p.album_id
       WHERE p.id::text=$1 AND p.status='approved' AND a.archived_at IS NULL
       RETURNING id::text,body,created_at::text`,[id,user.id,body]
  );
  if(!rows.length)return fail("Không tìm thấy ảnh",404);
  return NextResponse.json({comment:{...rows[0],author_id:user.id,author_name:user.name}},{status:201,headers:{"Cache-Control":"no-store"}});
}
