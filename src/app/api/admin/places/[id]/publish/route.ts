import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth"; import { db } from "@/lib/db";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401}); const {id}=await params,sql=db();
 const [before]=await sql`SELECT * FROM places WHERE id=${id}`; if(!before)return NextResponse.json({error:"NOT_FOUND"},{status:404});
 const [place]=await sql`UPDATE places SET moderation_status='approved',visibility='visible',updated_at=now() WHERE id=${id} RETURNING *`;
 await sql`UPDATE place_photos SET moderation_status='approved' WHERE place_id=${id}`;
 await sql`INSERT INTO moderation_logs(entity_type,entity_id,action,reason,before_data,after_data) VALUES('place',${id},'approved','Admin published place',${sql.json(before)},${sql.json(place)})`;
 return NextResponse.json({place});
}
