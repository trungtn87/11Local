import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isUuid,parseClaimReply,sameOrigin} from "@/lib/ownership-input";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
const headers={"Cache-Control":"no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function POST(request:Request,{params}:Context){
  if(!sameOrigin(request)) return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>4000) return fail("REQUEST_TOO_LARGE",413);
  const user=await getCurrentUser();
  if(!user||!isUuid(user.id)) return fail("LOGIN_REQUIRED",401);
  const {id}=await params;
  if(!isUuid(id)) return fail("NOT_FOUND",404);
  let input:ReturnType<typeof parseClaimReply>;
  try{input=parseClaimReply(await request.json());}
  catch(e){return fail(e instanceof Error?e.message:"INVALID_INPUT",400);}
  try{
    const result=await db().begin(async tx=>{
      const [current]=await tx`SELECT c.id,c.version,c.status FROM public.ownership_claims c
        JOIN public.users u ON u.id=c.user_id AND u.google_sub IS NOT NULL
        WHERE c.id=${id} AND c.user_id=${user.id} FOR UPDATE OF c`;
      if(!current) throw new Error("NOT_FOUND");
      if(Number(current.version)!==input.expectedVersion) throw new Error("STALE_VERSION");
      if(current.status!=="needs_info") throw new Error("NOT_WAITING_FOR_REPLY");
      await tx`INSERT INTO public.ownership_claim_messages(claim_id,sender,body)
        VALUES (${id},'claimant',${input.message})`;
      const [changed]=await tx`UPDATE public.ownership_claims
        SET status='pending',version=version+1,updated_at=now()
        WHERE id=${id} RETURNING version`;
      await tx`INSERT INTO public.moderation_logs(actor_user_id,entity_type,entity_id,action,reason)
        VALUES (${user.id},'ownership_claim',${id},'claimant_replied','Applicant submitted more information')`;
      return {id,status:"pending",version:Number(changed.version)};
    });
    return NextResponse.json(result,{headers});
  }catch(e){
    const code=(e as Error).message;
    if(code==="NOT_FOUND") return fail(code,404);
    if(["STALE_VERSION","NOT_WAITING_FOR_REPLY"].includes(code)) return fail(code,409);
    console.error("Ownership claim reply failed",e);
    return fail("REPLY_UNAVAILABLE",503);
  }
}
