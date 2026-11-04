import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
import {isUuid} from "@/lib/ownership-input";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  if(!await isAdmin()) return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
  const {id}=await params;
  if(!isUuid(id)) return NextResponse.json({error:"NOT_FOUND"},{status:404,headers});
  try{
    const sql=db();
    const [claim]=await sql`SELECT c.*,p.name AS place_name,p.slug,p.address,
      p.ownership_status,p.place_kind,u.email,u.display_name
      FROM public.ownership_claims c JOIN public.places p ON p.id=c.place_id
      JOIN public.users u ON u.id=c.user_id WHERE c.id=${id} LIMIT 1`;
    if(!claim) return NextResponse.json({error:"NOT_FOUND"},{status:404,headers});
    const [messages,photos,managers]=await Promise.all([
      sql`SELECT id,sender,body,created_at FROM public.ownership_claim_messages
        WHERE claim_id=${id} ORDER BY created_at,id LIMIT 100`,
      sql`SELECT id,created_at FROM public.ownership_claim_evidence_images
        WHERE claim_id=${id} ORDER BY created_at,id LIMIT 10`,
      sql`SELECT m.user_id,m.role,m.status,u.display_name,u.email
        FROM public.place_managers m JOIN public.users u ON u.id=m.user_id
        WHERE m.place_id=${claim.place_id} ORDER BY m.granted_at DESC`,
    ]);
    return NextResponse.json({claim,messages,photos,managers},{headers});
  }catch(e){console.error("Admin ownership claim details failed",e);
    return NextResponse.json({error:"CLAIM_UNAVAILABLE"},{status:503,headers});}
}
