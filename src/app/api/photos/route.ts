import {NextResponse} from "next/server";
import sharp from "sharp";
import {getCurrentUser} from "@/lib/user-auth";
import {db} from "@/lib/db";
import {isUuid,optionalDate} from "@/lib/family-contribution";

export const runtime = "nodejs";
const fail = (error:string,status:number) => NextResponse.json({error},{status});
export async function POST(request:Request) {
  const user=await getCurrentUser();
  if(!user) return fail("Tài khoản Google cần được Admin duyệt",401);
  if(!(request.headers.get("content-type")||"").startsWith("multipart/form-data")) return fail("Định dạng không hợp lệ",415);
  const max=20*1024*1024;
  if(Number(request.headers.get("content-length")||0)>max+1024*1024) return fail("Ảnh quá lớn",413);
  try {
    const data=await request.formData();
    const albumId=String(data.get("album_id")||"");
    const caption=String(data.get("caption")||"").slice(0,500);
    const batchRaw=data.get("batch_id");
    const batchId=batchRaw===null?null:batchRaw;
    const takenOn=optionalDate(data.get("taken_on"));
    const file=data.get("image");
    if(!(file instanceof File)||!/^image\/(jpeg|png|webp|avif)$/.test(file.type)||file.size>max||file.size===0)
      return fail("Chọn ảnh JPG, PNG, WebP hoặc AVIF tối đa 20MB",400);
    if(!isUuid(albumId)) return fail("Album không hợp lệ",400);
    if(batchId!==null&&!isUuid(batchId)) return fail("Lượt đóng góp không hợp lệ",400);
    if(takenOn===undefined) return fail("Ngày chụp không hợp lệ",400);

    const sql=db();
    const exists=await sql.unsafe("SELECT id FROM family_albums WHERE id::text=$1 AND archived_at IS NULL",[albumId]);
    if(!exists.length) return fail("Không tìm thấy album",404);
    const preflight=await sql.unsafe(
      "SELECT count(*)::int AS count FROM family_photos WHERE uploaded_by::text=$1 AND created_at > now()-interval '24 hours'",[user.id]);
    if(Number(preflight[0]?.count)>=30) return fail("Bạn đã đạt giới hạn 30 ảnh trong 24 giờ",429);

    const bytes=Buffer.from(await file.arrayBuffer());
    const out=await sharp(bytes,{limitInputPixels:50_000_000}).rotate()
      .resize({width:2048,height:2048,fit:"inside",withoutEnlargement:true})
      .webp({quality:82}).toBuffer({resolveWithObject:true});
    // The lock keeps quota checks correct even when several photos are uploaded concurrently.
    const result=await sql.begin(async tx=>{
      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[user.id]);
      const daily=await tx.unsafe(
        "SELECT count(*)::int AS count FROM family_photos WHERE uploaded_by::text=$1 AND created_at > now()-interval '24 hours'",[user.id]);
      if(Number(daily[0]?.count)>=30) return {kind:"quota"} as const;
      let placeId:string|null=null,milestoneId:string|null=null;
      if(batchId!==null) {
        const batches=await tx.unsafe(
          "SELECT place_id::text,milestone_id::text FROM family_contribution_batches WHERE user_id::text=$1 AND request_id::text=$2 AND album_id::text=$3",
          [user.id,batchId,albumId]);
        if(!batches.length) return {kind:"invalidBatch"} as const;
        placeId=batches[0].place_id as string|null;
        milestoneId=batches[0].milestone_id as string|null;
      }
      const rows=await tx.unsafe(
        "INSERT INTO family_photos(album_id,uploaded_by,content,caption,width,height,status,place_id,milestone_id,taken_on) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,'approved',$7::uuid,$8::uuid,$9::date) RETURNING id::text",
        [albumId,user.id,out.data,caption,out.info.width,out.info.height,placeId,milestoneId,takenOn]);
      return {kind:"ok",id:String(rows[0].id)} as const;
    });
    if(result.kind==="quota") return fail("Bạn đã đạt giới hạn 30 ảnh trong 24 giờ",429);
    if(result.kind==="invalidBatch") return fail("Lượt đóng góp không còn hợp lệ; hãy tải lại trang",409);
    return NextResponse.json({ok:true,id:result.id,status:"approved"},{status:201});
  } catch(error) {
    console.error("Photo upload failed",error instanceof Error?error.name:"unknown");
    return fail("Không thể tải ảnh. Vui lòng thử lại.",500);
  }
}
