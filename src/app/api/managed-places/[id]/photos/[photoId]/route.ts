import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isPlaceId,checkOrigin,parseOwnerPhotoAction} from "@/lib/owner-management-input";
import {ownerSession,requireOwnerPlace,errorStatus,noStore} from "@/lib/owner-management-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string;photoId:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});
export async function PATCH(request:Request,{params}:Context){
  if(!checkOrigin(request))return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>1500)return fail("REQUEST_TOO_LARGE",413);
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id,photoId}=await params;
  if(!isPlaceId(id)||!isPlaceId(photoId))return fail("NOT_FOUND",404);
  let action:ReturnType<typeof parseOwnerPhotoAction>;
  try{action=parseOwnerPhotoAction(await request.json());}
  catch{return fail("INVALID_ACTION",400);}
  try{
    const result=await db().begin(async tx=>{
      const {role}=await requireOwnerPlace(tx,id,user.id);
      if(role!=="owner")throw new Error("FORBIDDEN");
      const [photo]=await tx`SELECT id,photo_type,moderation_status,source
        FROM public.place_photos WHERE id=${photoId} AND place_id=${id} FOR UPDATE`;
      // Owners may only manage photos from the establishment, not community/admin.
      if(!photo||photo.source!=="owner")throw new Error("PHOTO_NOT_FOUND");
      if(photo.moderation_status!=="approved")throw new Error("PHOTO_NOT_APPROVED");
      if(action==="cover"){
        // Choose only an already-approved photo. One cover per place.
        await tx`UPDATE public.place_photos SET photo_type='gallery'
          WHERE place_id=${id} AND photo_type='cover' AND id<>${photoId}`;
        await tx`UPDATE public.place_photos SET photo_type='cover' WHERE id=${photoId}`;
      }else{
        // Soft hide: no deletion of image bytes. Rejected photos are not public.
        // Owner may not hide community/admin images.
        await tx`UPDATE public.place_photos
          SET moderation_status='rejected',photo_type='gallery' WHERE id=${photoId}`;
      }
      await tx`UPDATE public.places SET updated_at=now() WHERE id=${id}`;
      await tx`INSERT INTO public.moderation_logs(actor_user_id,entity_type,entity_id,
        action,reason,after_data)
        VALUES (${user.id},'photo',${photoId},
          ${action==="cover"?"owner_selected_cover":"owner_hidden"},
          ${action==="cover"?"Owner selected approved photo cover":"Owner hid own photo"},
          ${tx.json({placeId:id,previousType:photo.photo_type})})`;
      return {photoId,action,status:action==="hide"?"hidden":"approved"};
    });
    return NextResponse.json(result,{headers:noStore});
  }catch(e){
    const code=(e as Error).message;
    const status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("11Local owner photo action failed",e);
    return fail("OWNER_PHOTO_ACTION_FAILED",503);
  }
}
