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
    const sql=db();
    const claims=await sql`SELECT c.id,c.place_id,p.name AS place_name,p.slug,
      c.claimant_name,c.contact_phone,c.relationship,c.evidence,
      c.status,c.version,c.decision_note,c.reviewed_at,c.created_at,c.updated_at,
      (SELECT count(*)::int FROM public.ownership_claim_evidence_images i
        WHERE i.claim_id=c.id) AS image_count
      FROM public.ownership_claims c JOIN public.places p ON p.id=c.place_id
      JOIN public.users u ON u.id=c.user_id AND u.google_sub IS NOT NULL
      WHERE c.user_id=${user.id} ORDER BY c.created_at DESC,c.id DESC LIMIT 100`;
    const messages=await sql`SELECT m.id,m.claim_id,m.sender,m.body,m.created_at
      FROM public.ownership_claim_messages m
      JOIN public.ownership_claims c ON c.id=m.claim_id
      WHERE c.user_id=${user.id} ORDER BY m.created_at,m.id LIMIT 500`;
    return NextResponse.json({claims,messages},{headers});
  }catch(e){console.error("Ownership claims self lookup failed",e);
    return NextResponse.json({error:"CLAIMS_UNAVAILABLE"},{status:503,headers});}
}
