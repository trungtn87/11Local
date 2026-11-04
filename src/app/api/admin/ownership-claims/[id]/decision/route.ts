import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
import {isUuid,canReview,parseClaimDecision,sameOrigin,ClaimStatus} from "@/lib/ownership-input";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});

export async function POST(request:Request,{params}:Context){
  if(!await isAdmin()) return fail("UNAUTHORIZED",401);
  if(!sameOrigin(request)) return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>5000) return fail("REQUEST_TOO_LARGE",413);
  const {id}=await params;
  if(!isUuid(id)) return fail("NOT_FOUND",404);
  let decision:ReturnType<typeof parseClaimDecision>;
  try{decision=parseClaimDecision(await request.json());}
  catch(e){return fail(e instanceof Error?e.message:"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      // Lock place first in every Admin ownership workflow to serialize decisions
      // for different claimants of the same place.
      const [ref]=await tx`SELECT place_id FROM public.ownership_claims WHERE id=${id}`;
      if(!ref) throw new Error("NOT_FOUND");
      const [place]=await tx`SELECT id,place_kind,moderation_status,visibility
        FROM public.places WHERE id=${ref.place_id} FOR UPDATE`;
      if(!place) throw new Error("NOT_FOUND");
      const [claim]=await tx`SELECT c.id,c.place_id,c.user_id,c.status,c.version
        FROM public.ownership_claims c WHERE c.id=${id} FOR UPDATE`;
      if(!claim) throw new Error("NOT_FOUND");
      if(Number(claim.version)!==decision.expectedVersion) throw new Error("STALE_VERSION");
      if(!canReview(claim.status as ClaimStatus)) throw new Error("ALREADY_REVIEWED");
      const next=decision.action==="approve"?"approved":
        decision.action==="reject"?"rejected":
        decision.action==="dispute"?"disputed":"needs_info";

      if(next==="approved"){
        if(place.place_kind!=="business" || place.moderation_status!=="approved"
          || place.visibility!=="visible") throw new Error("PLACE_NOT_CLAIMABLE");
        const [account]=await tx`SELECT id FROM public.users
          WHERE id=${claim.user_id} AND google_sub IS NOT NULL`;
        if(!account) throw new Error("ACCOUNT_NOT_VERIFIED");
        const [owner]=await tx`SELECT user_id FROM public.place_managers
          WHERE place_id=${claim.place_id} AND role='owner' AND status='active' LIMIT 1`;
        if(owner) throw new Error("OWNER_EXISTS");
        // Only a manually approved ownership_claim may grant the owner role.
        await tx`INSERT INTO public.place_managers
          (place_id,user_id,role,status,ownership_claim_id)
          VALUES (${claim.place_id},${claim.user_id},'owner','active',${id})
          ON CONFLICT (place_id,user_id) DO UPDATE
          SET role='owner',status='active',ownership_claim_id=EXCLUDED.ownership_claim_id,
            granted_at=now(),revoked_at=NULL,version=public.place_managers.version+1,
            updated_at=now()`;
      }
      const [changed]=await tx`UPDATE public.ownership_claims
        SET status=${next},decision_note=${decision.note||null},
          review_method=${decision.reviewMethod||null},reviewed_at=now(),
          version=version+1,updated_at=now()
        WHERE id=${id} RETURNING version`;
      if(next==="needs_info"){
        await tx`INSERT INTO public.ownership_claim_messages(claim_id,sender,body)
          VALUES (${id},'admin',${decision.note})`;
      }
      // Keep the public badge derived from dispute/active owner, never from a
      // mere pending claim. Competing claims do not transfer rights implicitly.
      await tx`UPDATE public.places p SET ownership_status=CASE
        WHEN EXISTS(SELECT 1 FROM public.ownership_claims c
          WHERE c.place_id=p.id AND c.status='disputed') THEN 'disputed'
        WHEN EXISTS(SELECT 1 FROM public.place_managers m
          WHERE m.place_id=p.id AND m.role='owner' AND m.status='active') THEN 'verified'
        ELSE 'unverified' END,
        version=version+1,updated_at=now()
        WHERE p.id=${claim.place_id}`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('ownership_claim',${id},${decision.action},
          ${decision.note||"Admin verified ownership manually"},
          ${tx.json({status:claim.status,version:claim.version})},
          ${tx.json({status:next,version:Number(changed.version),placeId:claim.place_id,
            userId:claim.user_id,reviewMethod:decision.reviewMethod})})`;
      return {id,status:next,version:Number(changed.version),placeId:claim.place_id};
    });
    return NextResponse.json(result,{headers});
  }catch(e){
    const code=(e as Error).message;
    if(code==="NOT_FOUND") return fail(code,404);
    if(["STALE_VERSION","ALREADY_REVIEWED","OWNER_EXISTS","PLACE_NOT_CLAIMABLE"].includes(code)
      ||(e as {code?:string}).code==="23505") return fail(code==="OWNER_EXISTS"?"OWNER_EXISTS":
        (e as {code?:string}).code==="23505"?"OWNER_EXISTS":code,409);
    if(code==="ACCOUNT_NOT_VERIFIED") return fail(code,409);
    console.error("Admin ownership claim decision failed",e);
    return fail("DECISION_UNAVAILABLE",503);
  }
}
