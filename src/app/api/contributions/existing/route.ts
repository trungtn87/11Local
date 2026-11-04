
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {parseExistingFeedback} from "@/lib/contribution-existing";
import {processContributionPhotos,MAX_REQUEST_BYTES} from "@/lib/contribution-media";
import {consumeContributionLimit} from "@/lib/contribution-limit";
import {enqueueBusinessDiscordInTx} from "@/lib/discord-business-events";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request) {
  if(Number(request.headers.get("content-length")||0)>MAX_REQUEST_BYTES) return fail("REQUEST_TOO_LARGE",413);
  try {
    if(!await consumeContributionLimit(request)) return fail("RATE_LIMITED",429);
    const form=await request.formData();
    const raw=form.get("payload");
    if(typeof raw!=="string"||raw.length>15000) return fail("INVALID_INPUT",400);
    let input;
    try {input=parseExistingFeedback(JSON.parse(raw));}
    catch(e) {return fail(e instanceof Error?e.message:"INVALID_INPUT",400);}
    let photos:Buffer[];
    try {photos=await processContributionPhotos(form.getAll("photos"));}
    catch(e) {return fail(e instanceof Error?e.message:"INVALID_IMAGE",400);}
    if(input.kind==="photo" && !photos.length) return fail("PHOTO_REQUIRED",400);
    if(input.kind!=="photo" && photos.length) return fail("PHOTOS_NOT_ALLOWED",400);
    const token=randomBytes(24).toString("base64url");
    const trackingCode="DG-"+new Date().getFullYear()+"-"+randomBytes(5).toString("hex").toUpperCase();
    const tokenHash=createHash("sha256").update(token).digest("hex");
    const user=await getCurrentUser();
    const result=await db().begin(async tx=>{
      // Never accept feedback for hidden, pending or unapproved places.
      const [place]=await tx`SELECT id,name,version,slug FROM public.places
        WHERE id=${input.placeId} AND moderation_status='approved'
          AND visibility='visible' FOR SHARE`;
      if(!place) throw new Error("PLACE_NOT_PUBLIC");
      const payload={
        placeName:place.name,baseVersion:Number(place.version), note:input.note,
        reason:input.kind==="report"?input.reason:null,
        fieldKey:input.fieldKey,proposedValue:input.proposedValue,
      };
      const [row]=await tx`INSERT INTO public.contributions
        (tracking_code,tracking_token_hash,kind,place_id,payload,submitted_by,moderation_status)
        VALUES (${trackingCode},${tokenHash},${input.kind},${input.placeId},
          ${tx.json(payload)},${user?.id??null},'pending') RETURNING id`;
      for(let i=0;i<photos.length;i++){
        const photoId=randomUUID();
        await tx`INSERT INTO public.contribution_photos
          (id,contribution_id,sort_order,is_cover,mime_type,contents)
          VALUES (${photoId},${row.id},${i},false,'image/webp',${photos[i]})`;
      }
      const eventType=input.kind==="report"?"contribution.report":
        input.kind==="edit_place"?"contribution.edit_place":"contribution.photo";
      await enqueueBusinessDiscordInTx(tx,eventType,String(row.id));
      return {trackingCode,trackingUrl:"/theo-doi?token="+encodeURIComponent(token),status:"pending",photoCount:photos.length};
    });
    return NextResponse.json(result,{status:201,headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    if((e as Error).message==="PLACE_NOT_PUBLIC") return fail("PLACE_NOT_PUBLIC",404);
    console.error("Existing-place contribution failed",e);
    return fail("CONTRIBUTION_UNAVAILABLE",503);
  }
}
