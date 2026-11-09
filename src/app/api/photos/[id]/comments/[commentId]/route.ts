import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
import {getCurrentUser} from "@/lib/user-auth";
import {isUuid} from "@/lib/family-contribution";

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string;commentId:string}>}) {
  const {id,commentId}=await params;
  if(!isUuid(id)||!isUuid(commentId))return NextResponse.json({error:"Bình luận không hợp lệ"},{status:400});
  const user=await getCurrentUser(),admin=await isAdmin();
  if(!user&&!admin)return NextResponse.json({error:"Cần đăng nhập"},{status:401});
  const deleted=await db().unsafe(
    "DELETE FROM family_photo_comments WHERE id::text=$1 AND photo_id::text=$2 AND ($3::boolean OR user_id::text=$4) RETURNING id",
    [commentId,id,admin,user?.id||""]
  );
  return deleted.length?NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}})
    :NextResponse.json({error:"Không tìm thấy bình luận hoặc không có quyền xóa"},{status:404});
}
