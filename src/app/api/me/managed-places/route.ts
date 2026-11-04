import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isUuid} from "@/lib/ownership-input";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(){
  const user=await getCurrentUser();
  if(!user||!isUuid(user.id)) return NextResponse.json({error:"LOGIN_REQUIRED"},{status:401,headers});
  try{
    const places=await db()`SELECT p.id,p.slug,p.name,p.category_id,p.address,p.area,p.ownership_status,
      m.role,m.status,m.version AS manager_version,m.granted_at
      FROM public.place_managers m
      JOIN public.places p ON p.id=m.place_id
      JOIN public.users u ON u.id=m.user_id AND u.google_sub IS NOT NULL
      WHERE m.user_id=${user.id} AND m.status='active'
      ORDER BY p.name,p.id LIMIT 200`;
    return NextResponse.json({places},{headers});
  }catch(e){console.error("Managed places lookup failed",e);
    return NextResponse.json({error:"MANAGED_PLACES_UNAVAILABLE"},{status:503,headers});}
}
