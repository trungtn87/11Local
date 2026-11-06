import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isPlaceId} from "@/lib/owner-management-input";
import {ownerSession,requireOwnerPlace,errorStatus,noStore} from "@/lib/owner-management-server";
import {isUuid} from "@/lib/ownership-input";

export const dynamic="force-dynamic";
type Context={params:Promise<{id:string;videoId:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});

export async function DELETE(_:Request,{params}:Context){
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id,videoId}=await params;
  if(!isPlaceId(id)||!isUuid(videoId))return fail("NOT_FOUND",404);
  try{
    await db().begin(async tx=>{
      const {role}=await requireOwnerPlace(tx,id,user.id);
      if(role!=="owner")throw new Error("FORBIDDEN");
      const [video]=await tx`DELETE FROM public.place_video_reviews
        WHERE id=${videoId} AND place_id=${id} AND source='owner'
          AND submitted_by_user_id=${user.id}
        RETURNING id,provider,moderation_status`;
      if(!video)throw new Error("NOT_FOUND");
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,before_data)
        VALUES (${user.id},'place_video_review',${video.id},'owner_removed',
          'Owner removed own video link',
          ${tx.json({placeId:id,provider:video.provider,status:video.moderation_status})})`;
    });
    return NextResponse.json({deleted:true},{headers:noStore});
  }catch(e){
    const code=(e as Error).message,status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("Owner video removal failed",e);
    return fail("OWNER_VIDEO_DELETE_FAILED",503);
  }
}
