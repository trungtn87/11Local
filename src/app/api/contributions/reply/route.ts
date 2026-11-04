
import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {parseContributorReply} from "@/lib/contribution-existing";
import {processContributionPhotos,MAX_REQUEST_BYTES} from "@/lib/contribution-media";
import {consumeContributionLimit} from "@/lib/contribution-limit";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request) {
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin) return fail("INVALID_ORIGIN",403);
  if(Number(request.headers.get("content-length")||0)>MAX_REQUEST_BYTES) return fail("REQUEST_TOO_LARGE",413);
  try {
    if(!await consumeContributionLimit(request)) return fail("RATE_LIMITED",429);
    const form=await request.formData();
    const token=form.get("token");
    if(typeof token!=="string"||!/^[A-Za-z0-9_-]{32}$/.test(token)) return fail("INVALID_TOKEN",400);
    const raw=form.get("payload");
    if(typeof raw!=="string"||raw.length>3000) return fail("INVALID_INPUT",400);
    let reply;
    try {reply=parseContributorReply(JSON.parse(raw));}
    catch(e) {return fail(e instanceof Error?e.message:"INVALID_INPUT",400);}
    let photos:Buffer[];
    try {photos=await processContributionPhotos(form.getAll("photos"));}
    catch(e) {return fail(e instanceof Error?e.message:"INVALID_IMAGE",400);}
    const hash=createHash("sha256").update(token).digest("hex");
    const result=await db().begin(async tx=>{
      const [item]=await tx`SELECT id,version,moderation_status FROM public.contributions
        WHERE tracking_token_hash=${hash} FOR UPDATE`;
      if(!item) throw new Error("NOT_FOUND");
      if(item.moderation_status!=="needs_info") throw new Error("NOT_WAITING_FOR_REPLY");
      if(Number(item.version)!==reply.expectedVersion) throw new Error("STALE_VERSION");
      const [count]=await tx`SELECT count(*)::int AS total FROM public.contribution_photos
        WHERE contribution_id=${item.id}`;
      if(Number(count.total)+photos.length>4) throw new Error("TOO_MANY_PHOTOS");
      for(let i=0;i<photos.length;i++){
        const photoId=randomUUID();
        await tx`INSERT INTO public.contribution_photos
          (id,contribution_id,sort_order,is_cover,mime_type,contents)
          VALUES (${photoId},${item.id},${Number(count.total)+i},false,'image/webp',${photos[i]})`;
      }
      await tx`INSERT INTO public.contribution_messages (contribution_id,sender,body)
        VALUES (${item.id},'contributor',${reply.message})`;
      const [changed]=await tx`UPDATE public.contributions
        SET moderation_status='pending',version=version+1,updated_at=now()
        WHERE id=${item.id} RETURNING version`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,after_data)
        VALUES ('contribution',${item.id},'contributor_replied','Contributor replied to Admin',
          ${tx.json({version:changed.version,photoCount:photos.length})})`;
      await enqueueBusinessDiscordInTx(tx,"contribution.reply",String(item.id),Number(changed.version));
      return {status:"pending",version:Number(changed.version)};
    });
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    const code=(e as Error).message;
    if(code==="NOT_FOUND") return fail(code,404);
    if(["NOT_WAITING_FOR_REPLY","STALE_VERSION"].includes(code)) return fail(code,409);
    if(code==="TOO_MANY_PHOTOS") return fail(code,400);
    console.error("Community reply failed",e);
    return fail("REPLY_UNAVAILABLE",503);
  }
}
