import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import sharp from "sharp";
import {db} from "@/lib/db";
import {isPlaceId,checkOrigin} from "@/lib/owner-management-input";
import {ownerSession,requireOwnerPlace,errorStatus,noStore} from "@/lib/owner-management-server";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});
const LIMIT=10*1024*1024;
const ACCEPTED=new Set(["image/jpeg","image/png","image/webp","image/avif"]);
export async function POST(request:Request,{params}:Context){
  if(!checkOrigin(request))return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>LIMIT+100_000)
    return fail("REQUEST_TOO_LARGE",413);
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  let contents:Buffer;
  let caption:string;
  try{
    const body=await request.formData();
    const file=body.get("file");
    const text=body.get("caption");
    caption=typeof text==="string"?text.trim():"";
    if(caption.length>300||/[\u0000-\u001f]/u.test(caption))
      throw new Error("INVALID_CAPTION");
    if(!(file instanceof File)||!ACCEPTED.has(file.type)||!file.size||file.size>LIMIT)
      throw new Error("INVALID_IMAGE");
    contents=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:30_000_000})
      .rotate().resize({width:1600,height:1200,fit:"inside",withoutEnlargement:true})
      .webp({quality:80}).toBuffer();
    if(!contents.length||contents.length>2*1024*1024)throw new Error("INVALID_IMAGE");
  }catch(e){return fail((e as Error).message==="INVALID_CAPTION"?"INVALID_CAPTION":"INVALID_IMAGE",400);}
  try{
    const result=await db().begin(async tx=>{
      await requireOwnerPlace(tx,id,user.id);
      const [count]=await tx`SELECT count(*)::int AS total FROM public.place_photos
        WHERE place_id=${id} AND source='owner' AND moderation_status IN ('pending','approved')`;
      if(Number(count.total)>=100)throw new Error("IMAGE_LIMIT");
      const photoId=randomUUID();
      const [photo]=await tx`INSERT INTO public.place_photos
        (id,place_id,object_key,source,photo_type,moderation_status,caption,uploaded_by_user_id)
        VALUES (${photoId},${id},${"neon:"+photoId},'owner','gallery','pending',
          ${caption||null},${user.id})
        RETURNING id,photo_type,moderation_status,caption,created_at`;
      await tx`INSERT INTO public.place_image_blobs(photo_id,mime_type,contents)
        VALUES (${photoId},'image/webp',${contents})`;
      await tx`INSERT INTO public.moderation_logs(actor_user_id,entity_type,entity_id,
        action,reason,after_data)
        VALUES (${user.id},'photo',${photoId},'owner_submitted',
          'Owner uploaded photo for Admin review',${tx.json({placeId:id,bytes:contents.length})})`;
      await enqueueBusinessDiscordInTx(tx,"owner.photo",String(photo.id));
      return {photo};
    });
    return NextResponse.json(result,{status:201,headers:noStore});
  }catch(e){
    const code=(e as Error).message;
    const status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("11Local owner photo upload failed",e);
    return fail("OWNER_PHOTO_UNAVAILABLE",503);
  }
}
