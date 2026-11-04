import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
import {isUuid,parseManagerDecision,sameOrigin} from "@/lib/ownership-input";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{placeId:string}>};
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function POST(request:Request,{params}:Context){
  if(!await isAdmin()) return fail("UNAUTHORIZED",401);
  if(!sameOrigin(request)) return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>4000) return fail("REQUEST_TOO_LARGE",413);
  const {placeId}=await params;
  if(!isUuid(placeId)) return fail("NOT_FOUND",404);
  let decision:ReturnType<typeof parseManagerDecision>;
  try{decision=parseManagerDecision(await request.json());}
  catch(e){return fail(e instanceof Error?e.message:"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      const [place]=await tx`SELECT id FROM public.places WHERE id=${placeId} FOR UPDATE`;
      if(!place) throw new Error("NOT_FOUND");
      const [account]=await tx`SELECT id FROM public.users
        WHERE id=${decision.userId} AND google_sub IS NOT NULL LIMIT 1`;
      if(!account) throw new Error("ACCOUNT_NOT_VERIFIED");
      const [before]=await tx`SELECT role,status,version FROM public.place_managers
        WHERE place_id=${placeId} AND user_id=${decision.userId} FOR UPDATE`;
      let role:string, status:string, version:number;
      if(decision.action==="grant_manager"){
        if(before && (before.status==="active" || before.role==="owner"))
          throw new Error("ROLE_CONFLICT");
        const [row]=await tx`INSERT INTO public.place_managers
          (place_id,user_id,role,status,ownership_claim_id)
          VALUES (${placeId},${decision.userId},'manager','active',NULL)
          ON CONFLICT (place_id,user_id) DO UPDATE SET
            role='manager',status='active',ownership_claim_id=NULL,granted_at=now(),
            revoked_at=NULL,version=public.place_managers.version+1,updated_at=now()
          RETURNING role,status,version`;
        role=row.role;status=row.status;version=Number(row.version);
      }else{
        if(!before) throw new Error("MANAGER_NOT_FOUND");
        if(Number(before.version)!==decision.expectedVersion) throw new Error("STALE_VERSION");
        const valid=decision.action==="suspend"&&before.status==="active"
          ||decision.action==="resume"&&before.status==="suspended"
          ||decision.action==="revoke"&&before.status!=="revoked";
        if(!valid) throw new Error("INVALID_TRANSITION");
        if(decision.action==="resume"&&before.role==="owner"){
          const [other]=await tx`SELECT user_id FROM public.place_managers
            WHERE place_id=${placeId} AND role='owner' AND status='active'
              AND user_id<>${decision.userId} LIMIT 1`;
          if(other) throw new Error("OWNER_EXISTS");
        }
        const newStatus=decision.action==="suspend"?"suspended":
          decision.action==="resume"?"active":"revoked";
        const [row]=await tx`UPDATE public.place_managers
          SET status=${newStatus},revoked_at=${newStatus==="revoked"?new Date():null},
            version=version+1,updated_at=now()
          WHERE place_id=${placeId} AND user_id=${decision.userId}
          RETURNING role,status,version`;
        role=row.role;status=row.status;version=Number(row.version);
      }
      await tx`UPDATE public.places p SET ownership_status=CASE
        WHEN EXISTS(SELECT 1 FROM public.ownership_claims c
          WHERE c.place_id=p.id AND c.status='disputed') THEN 'disputed'
        WHEN EXISTS(SELECT 1 FROM public.place_managers m
          WHERE m.place_id=p.id AND m.role='owner' AND m.status='active') THEN 'verified'
        ELSE 'unverified' END,
        version=version+1,updated_at=now()
        WHERE p.id=${placeId}`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('place_manager',${placeId},${decision.action},${decision.note},
          ${tx.json({userId:decision.userId,role:before?.role||null,status:before?.status||null})},
          ${tx.json({userId:decision.userId,role,status,version})})`;
      const eventType=decision.action==="grant_manager"?"moderation.manager.grant_manager":
        decision.action==="suspend"?"moderation.manager.suspend":
        decision.action==="resume"?"moderation.manager.resume":"moderation.manager.revoke";
      await enqueueBusinessDiscordInTx(tx,eventType,placeId,`${decision.userId}:${version}`);
      return {placeId,userId:decision.userId,role,status,version};
    });
    return NextResponse.json(result,{headers});
  }catch(e){
    const code=(e as Error).message;
    if(["NOT_FOUND","MANAGER_NOT_FOUND"].includes(code)) return fail(code,404);
    if(["ACCOUNT_NOT_VERIFIED","STALE_VERSION","ROLE_CONFLICT","INVALID_TRANSITION","OWNER_EXISTS"].includes(code)
      ||(e as {code?:string}).code==="23505") return fail(code==="OWNER_EXISTS"?"OWNER_EXISTS":
        (e as {code?:string}).code==="23505"?"ROLE_CONFLICT":code,409);
    console.error("Admin place manager decision failed",e);
    return fail("MANAGER_DECISION_UNAVAILABLE",503);
  }
}
