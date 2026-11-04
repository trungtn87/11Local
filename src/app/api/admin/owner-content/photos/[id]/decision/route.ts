import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
import {isPlaceId,parseOwnerContentDecision,checkOrigin} from "@/lib/owner-management-input";
import {ownershipRole,noStore,errorStatus} from "@/lib/owner-management-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});
export async function POST(request:Request,{params}:Context){
  if(!await isAdmin())return fail("UNAUTHORIZED",401);
  if(!checkOrigin(request))return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>3000)return fail("REQUEST_TOO_LARGE",413);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  let decision:ReturnType<typeof parseOwnerContentDecision>;
  try{decision=parseOwnerContentDecision(await request.json());}
  catch(e){return fail((e as Error).message||"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      const [ref]=await tx`SELECT place_id FROM public.place_photos
        WHERE id=${id} AND source='owner'`;
      if(!ref)throw new Error("NOT_FOUND");
      const [place]=await tx`SELECT id FROM public.places WHERE id=${ref.place_id} FOR UPDATE`;
      if(!place)throw new Error("NOT_FOUND");
      const [photo]=await tx`SELECT id,place_id,uploaded_by_user_id,moderation_status
        FROM public.place_photos WHERE id=${id} AND source='owner' FOR UPDATE`;
      if(!photo)throw new Error("NOT_FOUND");
      if(photo.moderation_status!=="pending")throw new Error("ALREADY_REVIEWED");
      if(decision.action==="approve"&&(!photo.uploaded_by_user_id||
        !await ownershipRole(tx,photo.place_id,photo.uploaded_by_user_id)))
        throw new Error("PERMISSION_REVOKED");
      const next=decision.action==="approve"?"approved":"rejected";
      await tx`UPDATE public.place_photos SET moderation_status=${next}
        WHERE id=${id}`;
      await tx`UPDATE public.places SET updated_at=now() WHERE id=${place.id}`;
      await tx`INSERT INTO public.moderation_logs(entity_type,entity_id,action,
        reason,after_data) VALUES ('photo',${id},
        ${decision.action==="approve"?"owner_photo_approved":"owner_photo_rejected"},
        ${decision.note||"Admin reviewed owner photo"},
        ${tx.json({placeId:place.id,status:next})})`;
      return {id,status:next,placeId:place.id};
    });
    return NextResponse.json(result,{headers:noStore});
  }catch(e){
    const code=(e as Error).message;const status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("Admin owner photo moderation failed",e);
    return fail("PHOTO_DECISION_UNAVAILABLE",503);
  }
}
