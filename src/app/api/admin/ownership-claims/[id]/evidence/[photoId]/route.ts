import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {isUuid} from "@/lib/ownership-input";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string;photoId:string}>};
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function GET(_:Request,{params}:Context){
  if(!await isAdmin()) return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
  const {id,photoId}=await params;
  if(!isUuid(id)||!isUuid(photoId))
    return NextResponse.json({error:"NOT_FOUND"},{status:404,headers});
  try{
    const [photo]=await db()`SELECT mime_type,contents
      FROM public.ownership_claim_evidence_images
      WHERE id=${photoId} AND claim_id=${id} LIMIT 1`;
    if(!photo) return NextResponse.json({error:"NOT_FOUND"},{status:404,headers});
    return new NextResponse(photo.contents,{headers:{...headers,
      "Content-Type":"image/webp","Content-Disposition":"inline"}});
  }catch(e){console.error("Ownership private evidence read failed",e);
    return NextResponse.json({error:"EVIDENCE_UNAVAILABLE"},{status:503,headers});}
}
