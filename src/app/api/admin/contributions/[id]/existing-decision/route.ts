
import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {isUuid} from "@/lib/contribution-review";
import {changeFields,type ChangeField} from "@/lib/contribution-existing";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
type Decision={action:"approve"|"reject"|"needs_info";expectedVersion:number;note:string;approvedPhotoIds:string[]};
function parseDecision(raw:unknown):Decision {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("INVALID_INPUT");
  const v=raw as Record<string,unknown>;
  if(!["approve","reject","needs_info"].includes(String(v.action))) throw new Error("INVALID_ACTION");
  if(!Number.isSafeInteger(v.expectedVersion)||(v.expectedVersion as number)<1) throw new Error("INVALID_VERSION");
  const note=typeof v.note==="string"?v.note.trim():"";
  if(note.length>1200 || (v.action!=="approve"&&note.length<5)) throw new Error("REASON_REQUIRED");
  const ids=v.approvedPhotoIds ?? [];
  if(!Array.isArray(ids)||ids.length>4||ids.some(x=>typeof x!=="string"||!isUuid(x))||
    new Set(ids).size!==ids.length) throw new Error("INVALID_PHOTO_SELECTION");
  return {action:v.action as Decision["action"],expectedVersion:v.expectedVersion as number,
    note,approvedPhotoIds:ids as string[]};
}
export async function POST(request:Request,{params}:Context) {
  if(!await isAdmin()) return fail("UNAUTHORIZED",401);
  const {id}=await params;
  if(!isUuid(id)) return fail("NOT_FOUND",404);
  let decision:Decision;
  try{decision=parseDecision(await request.json());}
  catch(e){return fail(e instanceof Error?e.message:"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      const [item]=await tx`SELECT * FROM public.contributions
        WHERE id=${id} AND kind IN ('report','edit_place','photo') FOR UPDATE`;
      if(!item) throw new Error("NOT_FOUND");
      if(item.moderation_status!=="pending"&&item.moderation_status!=="needs_info")
        throw new Error("ALREADY_REVIEWED");
      if(Number(item.version)!==decision.expectedVersion) throw new Error("STALE_VERSION");
      const payload=item.payload as Record<string,unknown>;
      if(decision.action!=="approve"){
        const status=decision.action==="reject"?"rejected":"needs_info";
        const [updated]=await tx`UPDATE public.contributions SET moderation_status=${status},
          decision_note=${decision.note},reviewed_at=now(),updated_at=now(),version=version+1
          WHERE id=${id} RETURNING version`;
        await tx`INSERT INTO public.contribution_messages(contribution_id,sender,body)
          VALUES (${id},'admin',${decision.note})`;
        if(status==="rejected") await tx`DELETE FROM public.contribution_photos WHERE contribution_id=${id}`;
        await tx`INSERT INTO public.moderation_logs
          (entity_type,entity_id,action,reason,before_data,after_data)
          VALUES ('contribution',${id},${status},${decision.note},
            ${tx.json({status:item.moderation_status,version:item.version})},
            ${tx.json({status,version:updated.version})})`;
        await enqueueBusinessDiscordInTx(tx,
          status==="rejected"?"moderation.contribution.rejected":"moderation.contribution.needs_info",
          id,Number(updated.version));
        return {status,version:Number(updated.version),place:null};
      }
      const [place]=await tx`SELECT * FROM public.places WHERE id=${item.place_id}
        AND moderation_status='approved' AND visibility='visible' FOR UPDATE`;
      if(!place) throw new Error("PLACE_NOT_PUBLIC");
      let updatedPlace=place;
      if(item.kind==="edit_place"){
        const key=String(payload.fieldKey||"") as ChangeField;
        if(!Object.prototype.hasOwnProperty.call(changeFields,key) ||
          typeof payload.proposedValue!=="string") throw new Error("INVALID_FIELD");
        // Reject stale proposals: do not overwrite newer Admin/owner edits silently.
        if(Number(place.version)!==Number(payload.baseVersion)) throw new Error("STALE_PLACE");
        const value=payload.proposedValue;
        [updatedPlace]=await tx`UPDATE public.places SET
          name=CASE WHEN ${key}='name' THEN ${value} ELSE name END,
          address=CASE WHEN ${key}='address' THEN ${value} ELSE address END,
          area=CASE WHEN ${key}='area' THEN ${value} ELSE area END,
          description=CASE WHEN ${key}='description' THEN ${value} ELSE description END,
          summary=CASE WHEN ${key}='summary' THEN ${value} ELSE summary END,
          phone=CASE WHEN ${key}='phone' THEN NULLIF(${value},'') ELSE phone END,
          opening_hours=CASE WHEN ${key}='opening_hours' THEN NULLIF(${value},'') ELSE opening_hours END,
          website_url=CASE WHEN ${key}='website_url' THEN NULLIF(${value},'') ELSE website_url END,
          facebook_url=CASE WHEN ${key}='facebook_url' THEN NULLIF(${value},'') ELSE facebook_url END,
          youtube_url=CASE WHEN ${key}='youtube_url' THEN NULLIF(${value},'') ELSE youtube_url END,
          price_note=CASE WHEN ${key}='price_note' THEN NULLIF(${value},'') ELSE price_note END,
          version=version+1,updated_at=now()
          WHERE id=${place.id} RETURNING *`;
        await tx`INSERT INTO public.moderation_logs(entity_type,entity_id,action,reason,before_data,after_data)
          VALUES ('place',${place.id},'community_edit_approved',
            ${decision.note||"Admin approved community correction"},
            ${tx.json({field:key,value:place[key],version:place.version})},
            ${tx.json({field:key,value,version:updatedPlace.version,contributionId:id})})`;
      }
      let publishedPhotoCount=0;
      if(item.kind==="photo"){
        const staged=await tx`SELECT id FROM public.contribution_photos
          WHERE contribution_id=${id} ORDER BY sort_order,id FOR UPDATE`;
        const available=staged.map(x=>String(x.id));
        const chosen=decision.approvedPhotoIds;
        if(!chosen.length||chosen.some(x=>!available.includes(x))) throw new Error("INVALID_PHOTO_SELECTION");
        const [existingCover]=await tx`SELECT id FROM public.place_photos
          WHERE place_id=${place.id} AND photo_type IN ('cover','avatar')
            AND moderation_status='approved' LIMIT 1`;
        for(let i=0;i<chosen.length;i++){
          const photoId=chosen[i];
          // Community photos never replace an existing cover chosen by Admin/verified owner.
          const photoType= !existingCover && i===0 ? "cover" : "gallery";
          await tx`INSERT INTO public.place_photos
            (id,place_id,object_key,source,photo_type,moderation_status,sort_order)
            VALUES (${photoId},${place.id},${"neon:"+photoId},
              'community',${photoType},'approved',${i})`;
          await tx`INSERT INTO public.place_image_blobs(photo_id,mime_type,contents)
            SELECT id,mime_type,contents FROM public.contribution_photos
            WHERE contribution_id=${id} AND id=${photoId}`;
        }
        publishedPhotoCount=chosen.length;
        await tx`UPDATE public.places SET updated_at=now() WHERE id=${place.id}`;
      }
      // Reports are acknowledged, never automatically hide or mutate a place.
      const [updated]=await tx`UPDATE public.contributions
        SET moderation_status='approved',decision_note=${decision.note||null},
          reviewed_at=now(),updated_at=now(),version=version+1
        WHERE id=${id} RETURNING version`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('contribution',${id},'approved',${decision.note||"Admin approved community submission"},
          ${tx.json({status:item.moderation_status,kind:item.kind,version:item.version})},
          ${tx.json({status:"approved",kind:item.kind,version:updated.version,
            placeVersion:updatedPlace.version,photoCount:publishedPhotoCount})})`;
      if(decision.note) await tx`INSERT INTO public.contribution_messages(contribution_id,sender,body)
        VALUES (${id},'admin',${decision.note})`;
      await tx`DELETE FROM public.contribution_photos WHERE contribution_id=${id}`;
      await enqueueBusinessDiscordInTx(tx,"moderation.contribution.approved",id,Number(updated.version));
      return {status:"approved",version:Number(updated.version),
        place:{slug:place.slug,name:updatedPlace.name},publishedPhotoCount};
    });
    return NextResponse.json(result,{headers});
  }catch(e){
    const code=(e as Error).message;
    if(code==="NOT_FOUND"||code==="PLACE_NOT_PUBLIC") return fail(code,404);
    if(["ALREADY_REVIEWED","STALE_VERSION","STALE_PLACE"].includes(code)) return fail(code,409);
    if(["INVALID_FIELD","INVALID_PHOTO_SELECTION"].includes(code)) return fail(code,400);
    console.error("Existing-place moderation failed",e);
    return fail("REVIEW_FAILED",503);
  }
}
