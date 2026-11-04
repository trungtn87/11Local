import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerSession } from '@/lib/owner-management-server';
import { isUuid } from '@/lib/ownership-input';
import { dateRange } from '@/lib/analytics-policy';
import { menuReminder,ratingSummary,trafficSummary,vietnamDate } from '@/lib/owner-dashboard';
import { ownerDashboardSQL as queries } from '@/lib/owner-dashboard-sql';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const user=await ownerSession();
  if(!user)return fail('LOGIN_REQUIRED',401);
  const {id}=await params;
  if(!isUuid(id))return fail('NOT_FOUND',404);
  let range;
  try{range=dateRange(new URL(request.url).searchParams);}catch{return fail('INVALID_DATE_RANGE',400);}
  try{
    const result=await db().begin('isolation level repeatable read',async tx=>{
      // Shared place/grant/account locks serialize this read with existing revoke,
      // suspend and unlink operations. No Admin-cookie bypass or browser role trust.
      const [place]=await tx.unsafe(queries.authorizedPlace,[id,user.id]);
      if(!place)throw new Error('NOT_FOUND');
      const placeValues=[id],ownerValues=[id,user.id],rangeValues=[id,range.start,range.end];
      const [daily,totals,ratings,reviews,updates,updateCounts,menus,metadata]=await Promise.all([
        tx.unsafe(queries.traffic,rangeValues),tx.unsafe(queries.totals,rangeValues),
        tx.unsafe(queries.ratings,placeValues),tx.unsafe(queries.reviews,placeValues),
        tx.unsafe(queries.updates,ownerValues),tx.unsafe(queries.updateCounts,ownerValues),
        tx.unsafe(queries.menu,placeValues),tx.unsafe(queries.metadata),
      ]);
      const startedAt=metadata[0]?.started_at?new Date(metadata[0].started_at).toISOString():null;
      const measuredDay=startedAt?vietnamDate(startedAt):null;
      const now=new Date();
      return {
        place,range,asOf:now.toISOString(),startedAt,
        traffic:{...trafficSummary(range,startedAt,Number(totals[0].current),Number(totals[0].previous)),
          lifetime:Number(totals[0].lifetime??0),
          daily:daily.map(d=>({day:String(d.day),views:measuredDay&&String(d.day)>=measuredDay?Number(d.views):null}))},
        ratings:ratingSummary(ratings.map(r=>({stars:Number(r.stars),count:Number(r.count)}))),
        reviews,updates,updateCounts,
        menu:menuReminder(menus[0]?{has_content:menus[0].has_content,published_at:menus[0].published_at,hidden:menus[0].hidden}:null,now),
      };
    });
    return NextResponse.json(result,{headers});
  }catch(error){
    if(error instanceof Error&&error.message==='NOT_FOUND')return fail('NOT_FOUND',404);
    console.error('Owner dashboard unavailable',error);
    return fail('DASHBOARD_UNAVAILABLE',503);
  }
}
