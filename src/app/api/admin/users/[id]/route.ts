import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
const STATES=["pending","approved","rejected","blocked"] as const;
export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) {
  if (!(await isAdmin())) return NextResponse.json({error:"Không có quyền"},{status:401});
  const {id}=await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:"ID không hợp lệ"},{status:400});
  const body=await request.json().catch(()=>null);
  if(!body||!STATES.includes(body.status)|| (body.note!==undefined && typeof body.note!=="string"))
    return NextResponse.json({error:"Trạng thái không hợp lệ"},{status:400});
  const note=typeof body.note==="string"?body.note.trim().slice(0,500):null;
  const rows=await db().unsafe("UPDATE users SET family_access_status=$1,family_access_reviewed_at=now(),family_access_note=$2,updated_at=now() WHERE id::text=$3 AND google_sub IS NOT NULL RETURNING id::text,family_access_status AS status",[body.status,note,id]);
  return rows.length?NextResponse.json({ok:true,user:rows[0]}):NextResponse.json({error:"Không tìm thấy tài khoản"},{status:404});
}
