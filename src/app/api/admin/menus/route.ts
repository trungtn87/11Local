import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { fail,menuError,noStore } from '@/lib/menu-server';
export const dynamic='force-dynamic';
export async function GET(){
  if(!await isAdmin())return fail('UNAUTHORIZED',401);
  try{
    const places=await db()`SELECT p.id,p.name,p.slug,m.published_at,m.hidden,
      r.id AS revision_id,r.status AS revision_status
      FROM public.places p LEFT JOIN public.place_menus m ON m.place_id=p.id
      LEFT JOIN public.menu_revisions r ON r.place_id=p.id AND r.status IN ('draft','pending','needs_info')
      ORDER BY (r.status='pending') DESC NULLS LAST,p.name LIMIT 1000`;
    return NextResponse.json({places},{headers:noStore});
  }catch(e){return menuError(e);}
}
