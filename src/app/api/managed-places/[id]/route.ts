import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isPlaceId,parseOwnerEdit,checkOrigin} from "@/lib/owner-management-input";
import {ownerSession,requireOwnerPlace,noStore,errorStatus,MAX_JSON_BYTES} from "@/lib/owner-management-server";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});

export async function GET(_:Request,{params}:Context){
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  try{
    const sql=db();
    const [place]=await sql`SELECT p.id,p.slug,p.name,p.address,p.area,p.category_id,
      p.place_kind,p.moderation_status,p.visibility,p.summary,p.description,
      p.phone,p.website_url,p.opening_hours,p.price_note,p.version,
      m.role
      FROM public.places p JOIN public.place_managers m
        ON m.place_id=p.id AND m.user_id=${user.id} AND m.status='active'
      JOIN public.users u ON u.id=m.user_id AND u.google_sub IS NOT NULL
      WHERE p.id=${id} AND p.place_kind='business' LIMIT 1`;
    if(!place)return fail("NOT_FOUND",404);
    const [photos,revisions]=await Promise.all([
      sql`SELECT id,photo_type,moderation_status,caption,created_at
        FROM public.place_photos
        WHERE place_id=${id} AND source='owner'
        ORDER BY created_at DESC,id DESC LIMIT 100`,
      sql`SELECT id,base_version,changes,status,decision_note,created_at,reviewed_at
        FROM public.place_revisions
        WHERE place_id=${id} AND source='owner' AND submitted_by=${user.id}
        ORDER BY created_at DESC,id DESC LIMIT 30`,
    ]);
    return NextResponse.json({place:{...place,version:Number(place.version)},photos,revisions},{headers:noStore});
  }catch(e){console.error("11Local owner place read failed",e);
    return fail("OWNER_PLACE_UNAVAILABLE",503);}
}

export async function PATCH(request:Request,{params}:Context){
  if(!checkOrigin(request))return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>MAX_JSON_BYTES)
    return fail("REQUEST_TOO_LARGE",413);
  const user=await ownerSession();
  if(!user)return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  let input:ReturnType<typeof parseOwnerEdit>;
  try{input=parseOwnerEdit(await request.json());}
  catch(e){return fail((e as Error).message||"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      const {place}=await requireOwnerPlace(tx,id,user.id);
      if(Number(place.version)!==input.expectedVersion)throw new Error("STALE_VERSION");
      const [open]=await tx`SELECT id FROM public.place_revisions
        WHERE place_id=${id} AND source='owner' AND submitted_by=${user.id}
        AND status='pending' LIMIT 1`;
      if(open)throw new Error("PENDING_REVISION");
      const currentRows=await tx`SELECT summary,description,address,phone,website_url,
        opening_hours,price_note FROM public.places WHERE id=${id}`;
      const before=currentRows[0] as Record<string,unknown>;
      const changes=Object.fromEntries(Object.entries(input.changes).filter(
        ([key,value])=>(before[key]??null)!==(value??null)));
      if(!Object.keys(changes).length)throw new Error("NO_CHANGES");
      const [revision]=await tx`INSERT INTO public.place_revisions
        (place_id,submitted_by,source,base_version,changes)
        VALUES (${id},${user.id},'owner',${input.expectedVersion},${tx.json(changes)})
        RETURNING id,status,base_version,created_at`;
      await tx`INSERT INTO public.moderation_logs(actor_user_id,entity_type,entity_id,
        action,reason,after_data)
        VALUES (${user.id},'place_revision',${revision.id},'owner_submitted',
          'Owner proposed a moderated place edit',
          ${tx.json({placeId:id,baseVersion:input.expectedVersion,keys:Object.keys(changes)})})`;
      await enqueueBusinessDiscordInTx(tx,"owner.revision",String(revision.id));
      return {revision};
    });
    return NextResponse.json(result,{status:201,headers:noStore});
  }catch(e){
    const code=(e as Error).message;
    const status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("11Local owner edit submission failed",e);
    return fail("OWNER_EDIT_UNAVAILABLE",503);
  }
}
