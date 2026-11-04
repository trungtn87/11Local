import {NextResponse} from "next/server";
import sharp from "sharp";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isUuid,sameOrigin} from "@/lib/ownership-input";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
const MAX_UPLOAD=8*1024*1024;
export async function POST(request:Request,{params}:Context){
  if(!sameOrigin(request)) return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>MAX_UPLOAD+100_000)
    return fail("REQUEST_TOO_LARGE",413);
  const user=await getCurrentUser();
  if(!user||!isUuid(user.id)) return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isUuid(id)) return fail("NOT_FOUND",404);
  let bytes:Buffer;
  try{
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File)||!["image/jpeg","image/png","image/webp","image/avif"].includes(file.type)
      ||!file.size||file.size>MAX_UPLOAD) throw new Error("INVALID_IMAGE");
    bytes=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:20_000_000})
      .rotate().resize({width:1200,height:1200,fit:"inside",withoutEnlargement:true})
      .webp({quality:76}).toBuffer();
    if(!bytes.length||bytes.length>2*1024*1024) throw new Error("INVALID_IMAGE");
  }catch{return fail("INVALID_IMAGE",400);}
  try{
    const result=await db().begin(async tx=>{
      const [claim]=await tx`SELECT c.id,c.status FROM public.ownership_claims c
        JOIN public.users u ON u.id=c.user_id AND u.google_sub IS NOT NULL
        WHERE c.id=${id} AND c.user_id=${user.id} FOR UPDATE OF c`;
      if(!claim) throw new Error("NOT_FOUND");
      if(!["pending","needs_info"].includes(claim.status)) throw new Error("CLAIM_NOT_EDITABLE");
      const [count]=await tx`SELECT count(*)::int AS total
        FROM public.ownership_claim_evidence_images WHERE claim_id=${id}`;
      if(Number(count.total)>=3) throw new Error("TOO_MANY_IMAGES");
      const [image]=await tx`INSERT INTO public.ownership_claim_evidence_images
        (claim_id,mime_type,contents) VALUES (${id},'image/webp',${bytes})
        RETURNING id,created_at`;
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,after_data)
        VALUES (${user.id},'ownership_claim',${id},'evidence_uploaded',
          'Applicant uploaded private verification evidence',
          ${tx.json({imageId:image.id,bytes:bytes.length})})`;
      return {id:image.id,createdAt:image.created_at};
    });
    return NextResponse.json(result,{status:201,headers});
  }catch(e){
    const code=(e as Error).message;
    if(code==="NOT_FOUND") return fail(code,404);
    if(code==="CLAIM_NOT_EDITABLE") return fail(code,409);
    if(code==="TOO_MANY_IMAGES") return fail(code,400);
    console.error("Ownership evidence upload failed",e);
    return fail("EVIDENCE_UNAVAILABLE",503);
  }
}
