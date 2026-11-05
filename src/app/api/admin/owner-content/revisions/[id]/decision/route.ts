import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
import {isPlaceId,parseOwnerContentDecision,parseOwnerEdit} from "@/lib/owner-management-input";
import {ownershipRole,noStore,errorStatus} from "@/lib/owner-management-server";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});
export async function POST(request:Request,{params}:Context){
  if(!await isAdmin())return fail("UNAUTHORIZED",401);
  if(Number(request.headers.get("content-length")||0)>3000)return fail("REQUEST_TOO_LARGE",413);
  const {id}=await params;
  if(!isPlaceId(id))return fail("NOT_FOUND",404);
  let decision:ReturnType<typeof parseOwnerContentDecision>;
  try{decision=parseOwnerContentDecision(await request.json());}
  catch(e){return fail((e as Error).message||"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      // Read ID first; lock place before revision, as owner writes lock place first.
      const [ref]=await tx`SELECT place_id FROM public.place_revisions
        WHERE id=${id} AND source='owner'`;
      if(!ref)throw new Error("NOT_FOUND");
      const [place]=await tx`SELECT * FROM public.places WHERE id=${ref.place_id} FOR UPDATE`;
      if(!place)throw new Error("NOT_FOUND");
      const [revision]=await tx`SELECT id,place_id,submitted_by,changes,base_version,status
        FROM public.place_revisions WHERE id=${id} AND source='owner' FOR UPDATE`;
      if(!revision)throw new Error("NOT_FOUND");
      if(revision.status!=="pending")throw new Error("ALREADY_REVIEWED");
      if(decision.action==="approve"){
        if(Number(place.version)!==Number(revision.base_version))
          throw new Error("STALE_PLACE");
        if(!revision.submitted_by||!await ownershipRole(tx,revision.place_id,revision.submitted_by))
          throw new Error("PERMISSION_REVOKED");
        const parsed=parseOwnerEdit({expectedVersion:Number(revision.base_version),changes:revision.changes});
        const patch=parsed.changes;
        await tx`UPDATE public.places SET
          summary=${Object.hasOwn(patch,"summary")?patch.summary:place.summary},
          description=${Object.hasOwn(patch,"description")?patch.description:place.description},
          address=${Object.hasOwn(patch,"address")?patch.address:place.address},
          phone=${Object.hasOwn(patch,"phone")?patch.phone:place.phone},
          website_url=${Object.hasOwn(patch,"website_url")?patch.website_url:place.website_url},
          facebook_url=${Object.hasOwn(patch,"facebook_url")?patch.facebook_url:place.facebook_url},
          youtube_url=${Object.hasOwn(patch,"youtube_url")?patch.youtube_url:place.youtube_url},
          opening_hours=${Object.hasOwn(patch,"opening_hours")?patch.opening_hours:place.opening_hours},
          price_note=${Object.hasOwn(patch,"price_note")?patch.price_note:place.price_note},
          version=version+1,updated_at=now()
          WHERE id=${place.id}`;
      }
      await tx`UPDATE public.place_revisions
        SET status=${decision.action==="approve"?"approved":"rejected"},
          decision_note=${decision.note||null},reviewed_at=now() WHERE id=${id}`;
      await tx`INSERT INTO public.moderation_logs(entity_type,entity_id,action,
        reason,before_data,after_data) VALUES ('place_revision',${id},
        ${decision.action==="approve"?"owner_edit_approved":"owner_edit_rejected"},
        ${decision.note||"Admin verified owner content"},
        ${tx.json({status:revision.status,baseVersion:revision.base_version})},
        ${tx.json({placeId:place.id,changes:revision.changes,
          status:decision.action==="approve"?"approved":"rejected"})})`;
      await enqueueBusinessDiscordInTx(tx,
        decision.action==="approve"?"moderation.owner_revision.approved":"moderation.owner_revision.rejected",id);
      return {id,status:decision.action==="approve"?"approved":"rejected",placeId:place.id};
    });
    return NextResponse.json(result,{headers:noStore});
  }catch(e){
    const code=(e as Error).message;const status=errorStatus(code);
    if(status!==503)return fail(code,status);
    console.error("Admin owner revision decision failed",e);
    return fail("DECISION_UNAVAILABLE",503);
  }
}
