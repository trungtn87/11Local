import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isAdmin} from "@/lib/admin-auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){
  if(!await isAdmin()) return NextResponse.json({error:"UNAUTHORIZED"},{status:401,headers});
  const params=new URL(request.url).searchParams;
  const status=params.get("status")||null;
  if(status && !["pending","needs_info","approved","rejected","disputed"].includes(status))
    return NextResponse.json({error:"INVALID_STATUS"},{status:400,headers});
  const page=Number(params.get("page")||1);
  if(!Number.isSafeInteger(page)||page<1||page>100)
    return NextResponse.json({error:"INVALID_PAGE"},{status:400,headers});
  try{
    const sql=db();
    const claims=await sql`SELECT c.id,c.place_id,p.name AS place_name,p.slug,p.address,
      c.user_id,u.email,u.display_name,
      c.claimant_name,c.contact_phone,c.relationship,c.status,c.version,
      c.decision_note,c.review_method,c.created_at,c.updated_at,c.reviewed_at,
      (SELECT count(*)::int FROM public.ownership_claim_evidence_images i
        WHERE i.claim_id=c.id) AS image_count
      FROM public.ownership_claims c JOIN public.places p ON p.id=c.place_id
      JOIN public.users u ON u.id=c.user_id
      WHERE (${status}::text IS NULL OR c.status=${status})
      ORDER BY c.created_at DESC,c.id DESC
      LIMIT 30 OFFSET ${(page-1)*30}`;
    const [count]=await sql`SELECT count(*)::int AS total
      FROM public.ownership_claims c
      WHERE (${status}::text IS NULL OR c.status=${status})`;
    return NextResponse.json({claims,page,total:Number(count.total)},{headers});
  }catch(e){console.error("Admin ownership claim queue failed",e);
    return NextResponse.json({error:"CLAIMS_UNAVAILABLE"},{status:503,headers});}
}
