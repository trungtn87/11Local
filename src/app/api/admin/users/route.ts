import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({error:"Không có quyền"},{status:401});
  const rows=await db().unsafe("SELECT id::text,display_name,email,avatar_url,family_access_status AS status,family_access_note AS note,created_at::text,last_login_at::text FROM users WHERE google_sub IS NOT NULL ORDER BY CASE family_access_status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 500");
  return NextResponse.json({users:rows},{headers:{"Cache-Control":"no-store"}});
}
