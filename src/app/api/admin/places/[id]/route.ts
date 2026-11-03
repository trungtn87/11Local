import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { parsePlaceInput } from "@/lib/place-input";
const unauthorized=()=>NextResponse.json({error:"UNAUTHORIZED"},{status:401});
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}) {
  if(!await isAdmin()) return unauthorized();
  try { const {id}=await params,input=parsePlaceInput(await request.json()),sql=db();
    const [before]=await sql`SELECT * FROM places WHERE id=${id}`; if(!before)return NextResponse.json({error:"NOT_FOUND"},{status:404});
    const [place]=await sql`UPDATE places SET slug=${input.slug},name=${input.name},category_id=${input.categoryId},description=${input.description},address=${input.address},area=${input.area},latitude=${input.latitude},longitude=${input.longitude},phone=${input.phone},opening_hours=${input.openingHours},price_note=${input.priceNote},visibility=${input.visibility},updated_at=now() WHERE id=${id} RETURNING *`;
    await sql`INSERT INTO moderation_logs(entity_type,entity_id,action,reason,before_data,after_data) VALUES('place',${id},'updated','Admin updated place',${sql.json(before)},${sql.json(place)})`;
    return NextResponse.json({place});
  } catch(e){const x=e as {message?:string;code?:string};return NextResponse.json({error:x.code==='23505'?'SLUG_EXISTS':x.message||'INVALID_INPUT'},{status:x.code==='23505'?409:400});}
}
