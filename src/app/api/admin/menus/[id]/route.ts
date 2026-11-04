import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { lockMenu,readBody,fail,menuError,noStore } from '@/lib/menu-server';
import { positiveVersion } from '@/lib/menu-input';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await isAdmin())return fail('UNAUTHORIZED',401);
  try{
    const {id}=await params;const input=await readBody(request);const version=positiveVersion(input.expectedVersion);
    if(typeof input.hidden!=='boolean')return fail('INVALID_VISIBILITY',400);
    await db().begin(async tx=>{
      const menu=await lockMenu(tx,id,{admin:true,user:null});
      if(Number(menu.version)!==version)throw new Error('STALE_VERSION');
      await tx`UPDATE public.place_menus SET hidden=${input.hidden},version=version+1,updated_at=now() WHERE place_id=${id}`;
      await tx`INSERT INTO public.moderation_logs(entity_type,entity_id,action,reason) VALUES ('place_menu',${id},${input.hidden?'menu_hidden':'menu_restored'},'Admin changed menu visibility')`;
    });
    return NextResponse.json({ok:true},{headers:noStore});
  }catch(e){return menuError(e);}
}
