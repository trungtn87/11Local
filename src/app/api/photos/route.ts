import {NextResponse} from "next/server";
import sharp from "sharp";
import {getCurrentUser} from "@/lib/user-auth";
import {db} from "@/lib/db";
export const runtime="nodejs";
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Cần đăng nhập Google"},{status:401});
 const type=request.headers.get("content-type")||"";if(!type.startsWith("multipart/form-data"))return NextResponse.json({error:"Định dạng không hợp lệ"},{status:415});
 const max=20*1024*1024;if(Number(request.headers.get("content-length")||0)>max+1024*1024)return NextResponse.json({error:"Ảnh quá lớn"},{status:413});
 try{
  const data=await request.formData(),id=String(data.get("album_id")||""),caption=String(data.get("caption")||"").slice(0,500);
  const file=data.get("image");if(!(file instanceof File)||!/^image\/(jpeg|png|webp|avif)$/.test(file.type)||file.size>max||file.size===0)return NextResponse.json({error:"Chọn ảnh JPG, PNG, WebP hoặc AVIF tối đa 20MB"},{status:400});
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Album không hợp lệ"},{status:400});
  const sql=db();const exists=await sql.unsafe("SELECT id FROM family_albums WHERE id::text=$1 AND archived_at IS NULL",[id]);if(!exists.length)return NextResponse.json({error:"Không tìm thấy album"},{status:404});
  // Cheap fast-fail for accounts already at quota. The second check under
  // advisory lock below remains authoritative for concurrent submissions.
  const preflight=await sql.unsafe("SELECT count(*)::int AS count FROM family_photos WHERE uploaded_by::text=$1 AND created_at > now()-interval '24 hours'",[user.id]);
  if(Number(preflight[0]?.count)>=30)return NextResponse.json({error:"Bạn đã đạt giới hạn 30 ảnh trong 24 giờ"},{status:429});
  const bytes=Buffer.from(await file.arrayBuffer());const out=await sharp(bytes,{limitInputPixels:50_000_000}).rotate().resize({width:2048,height:2048,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
  // Serialize concurrent uploads per Google account. Count and insert must
  // happen in the same transaction while holding the same advisory lock.
  const insertedId=await sql.begin(async tx=>{
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[user.id]);
    const daily=await tx.unsafe("SELECT count(*)::int AS count FROM family_photos WHERE uploaded_by::text=$1 AND created_at > now()-interval '24 hours'",[user.id]);
    if(Number(daily[0]?.count)>=30)return null;
    const rows=await tx.unsafe("INSERT INTO family_photos(album_id,uploaded_by,content,caption,width,height,status) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,'approved') RETURNING id::text",[id,user.id,out.data,caption,out.info.width,out.info.height]);
    return String(rows[0].id);
  });
  if(!insertedId)return NextResponse.json({error:"Bạn đã đạt giới hạn 30 ảnh trong 24 giờ"},{status:429});
  return NextResponse.json({ok:true,id:insertedId,status:"approved"},{status:201});
 }catch(error){console.error("Photo upload failed",error instanceof Error?error.name:"unknown");return NextResponse.json({error:"Không thể tải ảnh. Vui lòng thử lại."},{status:500});}
}
