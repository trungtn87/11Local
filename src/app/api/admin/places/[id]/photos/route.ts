import { randomUUID } from "node:crypto"; import { NextResponse } from "next/server"; import sharp from "sharp";
import { isAdmin } from "@/lib/admin-auth"; import { db } from "@/lib/db";
const MAX_INPUT=10*1024*1024;
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401}); const {id}=await params,form=await request.formData(),file=form.get("file");
 if(!(file instanceof File)||!file.type.startsWith("image/")||file.size>MAX_INPUT)return NextResponse.json({error:"INVALID_IMAGE"},{status:400});
 const source=Buffer.from(await file.arrayBuffer());
 const contents=await sharp(source,{limitInputPixels:40_000_000}).rotate().resize({width:1600,height:1200,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer();
 if(!contents.length)return NextResponse.json({error:"INVALID_IMAGE"},{status:400});
 const sql=db(),photoId=randomUUID(); await sql.begin(async tx=>{await tx`INSERT INTO place_photos(id,place_id,object_key,source,photo_type,moderation_status) VALUES(${photoId},${id},${`neon:${photoId}`},'admin','gallery','pending')`;await tx`INSERT INTO place_image_blobs(photo_id,mime_type,contents) VALUES(${photoId},'image/webp',${contents})`;});
 return NextResponse.json({photo:{id:photoId,mimeType:"image/webp",bytes:contents.length}},{status:201});
}
