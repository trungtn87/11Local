import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isPlaceId} from "@/lib/owner-management-input";
import {ownerSession,noStore} from "@/lib/owner-management-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{id:string;photoId:string}>};
export async function GET(_:Request,{params}:Context){
  const user=await ownerSession();
  if(!user)return NextResponse.json({error:"LOGIN_REQUIRED"},{status:401,headers:noStore});
  const {id,photoId}=await params;
  if(!isPlaceId(id)||!isPlaceId(photoId))
    return NextResponse.json({error:"NOT_FOUND"},{status:404,headers:noStore});
  try{
    const [photo]=await db()`SELECT b.mime_type,b.contents
      FROM public.place_photos p
      JOIN public.place_image_blobs b ON b.photo_id=p.id
      JOIN public.place_managers m ON m.place_id=p.place_id
        AND m.user_id=${user.id} AND m.status='active'
      JOIN public.users u ON u.id=m.user_id AND u.google_sub IS NOT NULL
      WHERE p.place_id=${id} AND p.id=${photoId} AND p.source='owner' LIMIT 1`;
    if(!photo)return NextResponse.json({error:"NOT_FOUND"},{status:404,headers:noStore});
    return new NextResponse(photo.contents,{headers:{
      "Content-Type":"image/webp","Cache-Control":"private,no-store",
      "Content-Disposition":"inline","X-Content-Type-Options":"nosniff",
    }});
  }catch(e){
    console.error("Owner photo read failed",e);
    return NextResponse.json({error:"IMAGE_UNAVAILABLE"},{status:503,headers:noStore});
  }
}
