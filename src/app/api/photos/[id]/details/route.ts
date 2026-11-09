import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isAdmin} from "@/lib/admin-auth";
import {invalidateFamilyPublic} from "@/lib/family";
import {isUuid} from "@/lib/family-contribution";

const fail=(error:string,status:number)=>NextResponse.json({error},{status:status,headers:{"Cache-Control":"no-store"}});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!isUuid(id))return fail("Ảnh không hợp lệ",400);
  const user=await getCurrentUser();
  const admin=await isAdmin();
  if(!user&&!admin)return fail("Bạn cần đăng nhập để sửa ảnh",401);
  let input:unknown;
  try {input=await request.json();} catch {return fail("Dữ liệu không hợp lệ",400);}
  if(!input||typeof input!=="object"||Array.isArray(input))return fail("Dữ liệu không hợp lệ",400);
  const record=input as Record<string,unknown>;
  if(typeof record.title!=="string"||typeof record.caption!=="string")return fail("Thiếu tên hoặc mô tả",400);
  const title=record.title.trim(), caption=record.caption.trim();
  if(title.length>150||caption.length>2000)return fail("Tên hoặc mô tả quá dài",400);
  try {
    const rows=await db().unsafe(
      "UPDATE family_photos SET title=$2,caption=$3 WHERE id::text=$1 AND ($4::boolean OR uploaded_by::text=$5) RETURNING id",
      [id,title,caption,admin,user?.id||""]
    );
    if(!rows.length)return fail("Không tìm thấy ảnh hoặc không có quyền sửa",404);
    invalidateFamilyPublic();
    return NextResponse.json({ok:true,title,caption},{headers:{"Cache-Control":"no-store"}});
  }catch{return fail("Không thể cập nhật ảnh",500);}
}
