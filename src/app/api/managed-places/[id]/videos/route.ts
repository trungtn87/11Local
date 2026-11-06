import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isPlaceId} from "@/lib/owner-management-input";
import {ownerSession,requireOwnerPlace,errorStatus,noStore} from "@/lib/owner-management-server";
import {parsePlaceVideoLink} from "@/lib/place-video-links";

export const dynamic="force-dynamic";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});

export async function GET(_:Request,{params}:Context){
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  try{
    const videos=await db().begin(async tx=>{
      const {role}=await requireOwnerPlace(tx,id,user.id);
      if(role!=="owner")throw new Error("FORBIDDEN");
      return tx`SELECT id,provider,source_url,title,creator_name,is_featured,visibility,
        moderation_status,decision_note,source,created_at,
        (source='owner' AND submitted_by_user_id=${user.id}) AS is_mine
        FROM public.place_video_reviews WHERE place_id=${id}
          AND ((moderation_status='approved' AND visibility='visible')
            OR (source='owner' AND submitted_by_user_id=${user.id}))
        ORDER BY created_at DESC LIMIT 150`;
    });
    return NextResponse.json({videos},{headers:noStore});
  }catch(e){
    const code=(e as Error).message,status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("Owner video listing failed",e);
    return fail("OWNER_VIDEOS_UNAVAILABLE",503);
  }
}

export async function POST(request:Request,{params}:Context){
  if(Number(request.headers.get("content-length")||0)>4096)return fail("REQUEST_TOO_LARGE",413);
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  let input:{link:ReturnType<typeof parsePlaceVideoLink>;title:string;creatorName:string};
  try{
    const body=await request.json();
    const link=parsePlaceVideoLink(body?.url);
    const title=typeof body?.title==="string"?body.title.trim():"";
    const creatorName=typeof body?.creatorName==="string"?body.creatorName.trim():"";
    if(title.length>180||creatorName.length>120||/[\u0000-\u001f]/.test(title+creatorName))
      throw new Error("INVALID_VIDEO_DETAILS");
    input={link,title,creatorName};
  }catch(e){return fail((e as Error).message||"INVALID_VIDEO_URL",400);}
  try{
    const video=await db().begin(async tx=>{
      const {role}=await requireOwnerPlace(tx,id,user.id);
      if(role!=="owner")throw new Error("FORBIDDEN");
      const [count]=await tx`SELECT count(*)::int AS total FROM public.place_video_reviews
        WHERE place_id=${id} AND source='owner' AND submitted_by_user_id=${user.id}
          AND moderation_status IN ('pending','approved')`;
      if(Number(count.total)>=50)throw new Error("VIDEO_LIMIT");
      const [created]=await tx`INSERT INTO public.place_video_reviews
        (place_id,provider,source_url,normalized_key,title,creator_name,
          source,submitted_by_user_id,moderation_status)
        VALUES (${id},${input.link.provider},${input.link.sourceUrl},${input.link.normalizedKey},
          ${input.title},${input.creatorName},'owner',${user.id},'pending')
        RETURNING id,source_url,provider,title,creator_name,moderation_status,created_at`;
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,after_data)
        VALUES (${user.id},'place_video_review',${created.id},'owner_submitted',
          'Owner submitted video link for moderation',
          ${tx.json({placeId:id,provider:input.link.provider})})`;
      return created;
    });
    return NextResponse.json({video},{status:201,headers:noStore});
  }catch(e){
    if((e as {code?:string}).code==="23505")return fail("VIDEO_EXISTS",409);
    const code=(e as Error).message;
    if(code==="VIDEO_LIMIT")return fail(code,409);
    const status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("Owner video submission failed",e);
    return fail("OWNER_VIDEO_SAVE_FAILED",503);
  }
}
