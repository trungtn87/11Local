import {NextResponse} from "next/server";
import {isAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {noStore} from "@/lib/owner-management-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});
export async function GET(){
  if(!await isAdmin())return fail("UNAUTHORIZED",401);
  try{
    const sql=db();
    const [revisions,photos]=await Promise.all([
      sql`SELECT r.id,r.place_id,p.name AS place_name,p.slug,r.submitted_by,
        u.display_name AS sender_name,u.email,r.base_version,p.version AS place_version,
        r.changes,r.status,r.decision_note,r.created_at,r.reviewed_at
        FROM public.place_revisions r
        JOIN public.places p ON p.id=r.place_id
        LEFT JOIN public.users u ON u.id=r.submitted_by
        WHERE r.source='owner' AND r.status='pending'
        ORDER BY r.created_at ASC,r.id ASC LIMIT 100`,
      sql`SELECT ph.id,ph.place_id,p.name AS place_name,p.slug,
        ph.uploaded_by_user_id AS submitted_by,u.display_name AS sender_name,
        u.email,ph.caption,ph.created_at
        FROM public.place_photos ph
        JOIN public.places p ON p.id=ph.place_id
        LEFT JOIN public.users u ON u.id=ph.uploaded_by_user_id
        WHERE ph.source='owner' AND ph.moderation_status='pending'
        ORDER BY ph.created_at ASC,ph.id ASC LIMIT 100`,
    ]);
    return NextResponse.json({revisions,photos},{headers:noStore});
  }catch(e){console.error("Admin owner content queue failed",e);
    return fail("QUEUE_UNAVAILABLE",503);}
}
