import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isUuid,parseClaimInput} from "@/lib/ownership-input";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});

export async function POST(request:Request){
  if(Number(request.headers.get("content-length")||0)>6000) return fail("REQUEST_TOO_LARGE",413);
  const user=await getCurrentUser();
  if(!user||!isUuid(user.id)) return fail("LOGIN_REQUIRED",401);
  let input:ReturnType<typeof parseClaimInput>;
  try {input=parseClaimInput(await request.json());}
  catch(e){return fail(e instanceof Error && e.message.startsWith("INVALID_")?e.message:"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      const [account]=await tx`SELECT id FROM public.users
        WHERE id=${user.id} AND google_sub IS NOT NULL LIMIT 1`;
      if(!account) throw new Error("LOGIN_REQUIRED");
      const [place]=await tx`SELECT id FROM public.places WHERE id=${input.placeId}
        AND place_kind='business' AND moderation_status='approved'
        AND visibility='visible' LIMIT 1`;
      if(!place) throw new Error("PLACE_NOT_CLAIMABLE");
      const [alreadyOwner]=await tx`SELECT user_id FROM public.place_managers
        WHERE place_id=${input.placeId} AND user_id=${user.id}
          AND role='owner' AND status='active' LIMIT 1`;
      if(alreadyOwner) throw new Error("ALREADY_OWNER");
      const [open]=await tx`SELECT id FROM public.ownership_claims
        WHERE place_id=${input.placeId} AND user_id=${user.id}
          AND status IN ('pending','needs_info','disputed') LIMIT 1`;
      if(open) throw new Error("CLAIM_EXISTS");

      const [limit]=await tx`INSERT INTO public.ownership_claim_limits(user_id,window_start,attempts)
        VALUES (${user.id},now(),1)
        ON CONFLICT (user_id) DO UPDATE SET
          attempts=CASE WHEN public.ownership_claim_limits.window_start < now()-interval '24 hours'
            THEN 1 ELSE public.ownership_claim_limits.attempts+1 END,
          window_start=CASE WHEN public.ownership_claim_limits.window_start < now()-interval '24 hours'
            THEN now() ELSE public.ownership_claim_limits.window_start END
        RETURNING attempts`;
      if(Number(limit.attempts)>5) throw new Error("RATE_LIMITED");
      const [claim]=await tx`INSERT INTO public.ownership_claims
        (place_id,user_id,claimant_name,contact_phone,relationship,evidence)
        VALUES (${input.placeId},${user.id},${input.claimantName},
          ${input.contactPhone},${input.relationship},${tx.json({statement:input.statement})})
        RETURNING id,status,version,created_at`;
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,after_data)
        VALUES (${user.id},'ownership_claim',${claim.id},'submitted','Google user requested place management',
          ${tx.json({placeId:input.placeId,status:claim.status,relationship:input.relationship})})`;
      await enqueueBusinessDiscordInTx(tx,"ownership.claimed",String(claim.id),Number(claim.version));
      return {id:claim.id,status:claim.status,version:Number(claim.version),createdAt:claim.created_at};
    });
    return NextResponse.json(result,{status:201,headers});
  }catch(e){
    const code=(e as Error).message;
    if(code==="LOGIN_REQUIRED") return fail(code,401);
    if(code==="PLACE_NOT_CLAIMABLE") return fail(code,404);
    if(["ALREADY_OWNER","CLAIM_EXISTS"].includes(code)||(e as {code?:string}).code==="23505")
      return fail(code==="ALREADY_OWNER"?"ALREADY_OWNER":"CLAIM_EXISTS",409);
    if(code==="RATE_LIMITED") return fail(code,429);
    console.error("11Local ownership claim submission failed",e);
    return fail("CLAIM_UNAVAILABLE",503);
  }
}
