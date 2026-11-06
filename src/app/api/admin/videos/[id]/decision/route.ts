import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {isUuid} from "@/lib/ownership-input";

type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});

export async function POST(request:Request,{params}:Context){
  if(!await isAdmin())return fail("UNAUTHORIZED",401);
  const {id}=await params;
  if(!isUuid(id))return fail("NOT_FOUND",404);
  const body=await request.json().catch(()=>null);
  const action=body?.action;
  const note=typeof body?.note==="string"?body.note.trim():"";
  if(!["approve","reject"].includes(action)||note.length>1000||
    (action==="reject"&&note.length<5))return fail("INVALID_DECISION",400);
  try{
    const video=await db().begin(async tx=>{
      const [previous]=await tx`SELECT id,source,moderation_status,place_id
        FROM public.place_video_reviews WHERE id=${id} FOR UPDATE`;
      if(!previous)throw new Error("NOT_FOUND");
      if(previous.source!=="owner"||previous.moderation_status!=="pending")
        throw new Error("ALREADY_REVIEWED");
      const status=action==="approve"?"approved":"rejected";
      const [updated]=await tx`UPDATE public.place_video_reviews SET moderation_status=${status},
        decision_note=${note||null},reviewed_at=now(),updated_at=now()
        WHERE id=${id} RETURNING *`;
      await tx`INSERT INTO public.moderation_logs(entity_type,entity_id,action,reason,after_data)
        VALUES ('place_video_review',${id},${status},${note||"Admin reviewed video"},
          ${tx.json({placeId:previous.place_id,moderationStatus:status})})`;
      return updated;
    });
    return NextResponse.json({video},{headers});
  }catch(e){
    const code=(e as Error).message;
    if(code==="NOT_FOUND")return fail(code,404);
    if(code==="ALREADY_REVIEWED")return fail(code,409);
    console.error("Admin video decision failed",e);
    return fail("VIDEO_REVIEW_FAILED",503);
  }
}
