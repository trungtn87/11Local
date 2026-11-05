import type postgres from 'postgres';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { ownerSession, requireOwnerPlace, ownershipRole } from '@/lib/owner-management-server';
import { parseMenu, menuPhotoIds, positiveVersion, UUID, currentMenu, canEditMenuRevision, parseMenuDecision, assertMenuDecision } from '@/lib/menu-input';
import type { MenuContent } from '@/lib/menu-input';
export const noStore={'Cache-Control':'no-store'};
export const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:noStore});
export function menuError(error:unknown){
  const code=error instanceof Error?error.message:'UNAVAILABLE';
  const status=code==='LOGIN_REQUIRED'?401:code==='FORBIDDEN'?403:code==='NOT_FOUND'?404:code==='REQUEST_TOO_LARGE'?413:code.startsWith('INVALID_')?400:['STALE_VERSION','PENDING_REVISION','PERMISSION_REVOKED','PLACE_NOT_EDITABLE','ALREADY_REVIEWED','PHOTOS_NOT_APPROVED'].includes(code)?409:503;
  if(status===503)console.error('Menu operation failed',error);
  return fail(status===503?'MENU_UNAVAILABLE':code,status);
}
export async function menuActor(){const admin=await isAdmin();const user=admin?null:await ownerSession();if(!admin&&!user)throw new Error('LOGIN_REQUIRED');return {admin,user};}
export async function lockMenu(tx:postgres.TransactionSql,id:string,actor:Awaited<ReturnType<typeof menuActor>>){
  if(!UUID.test(id))throw new Error('NOT_FOUND');
  if(actor.admin){const [p]=await tx`SELECT id FROM public.places WHERE id=${id} FOR UPDATE`;if(!p)throw new Error('NOT_FOUND');}
  else await requireOwnerPlace(tx,id,actor.user!.id);
  await tx`INSERT INTO public.place_menus(place_id) VALUES (${id}) ON CONFLICT DO NOTHING`;
  const [menu]=await tx`SELECT * FROM public.place_menus WHERE place_id=${id} FOR UPDATE`;
  return menu;
}
export async function checkMenuPhotos(tx:postgres.TransactionSql,id:string,content:MenuContent){
  const ids=menuPhotoIds(content);if(!ids.length)return;
  const rows=await tx`SELECT ph.id FROM public.place_photos ph JOIN public.place_image_blobs b ON b.photo_id=ph.id
    WHERE ph.id=ANY(${ids}::uuid[]) AND ph.place_id=${id} AND ph.moderation_status='approved' FOR SHARE OF ph`;
  if(rows.length!==ids.length)throw new Error('PHOTOS_NOT_APPROVED');
}
export async function readBody(request:Request){
  if(Number(request.headers.get('content-length')||0)>200_000)throw new Error('REQUEST_TOO_LARGE');
  const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_JSON');
  let size=0;const chunks:Uint8Array[]=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>200_000){await reader.cancel();throw new Error('REQUEST_TOO_LARGE');}chunks.push(value);}}finally{reader.releaseLock();}
  try{const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed;}catch{throw new Error('INVALID_JSON');}
}
export async function readManagedMenu(id:string){
  const actor=await menuActor();
  return db().begin(async tx=>{
    const menu=await lockMenu(tx,id,actor);
    const revisions=await tx`SELECT * FROM public.menu_revisions WHERE place_id=${id} ORDER BY created_at DESC,id DESC LIMIT 30`;
    const open=revisions.find(r=>['draft','pending','needs_info'].includes(r.status));
    const [place]=await tx`SELECT id,name,slug FROM public.places WHERE id=${id}`;
    const photos=await tx`SELECT ph.id,ph.caption FROM public.place_photos ph JOIN public.place_image_blobs b ON b.photo_id=ph.id
      WHERE ph.place_id=${id} AND ph.moderation_status='approved' ORDER BY ph.created_at DESC LIMIT 100`;
    return {place,menu,revisions,open:open??null,photos,admin:actor.admin,canEdit:canEditMenuRevision(open?{source:open.source,submitted_by:open.submitted_by,status:open.status,version:open.version}:null,actor.admin,actor.user?.id??null)};
  });
}
export async function saveMenu(request:Request,id:string){
  const input=await readBody(request);const actor=await menuActor();
  const content=parseMenu(input.content);const expectedVersion=positiveVersion(input.expectedVersion);
  if(input.action!=='save'&&input.action!=='submit')throw new Error('INVALID_ACTION');
  const revisionId=input.revisionId;
  if(revisionId!=null&&(typeof revisionId!=='string'||!UUID.test(revisionId)))throw new Error('INVALID_REVISION');
  return db().begin(async tx=>{
    const menu=await lockMenu(tx,id,actor);
    if(Number(menu.version)!==expectedVersion)throw new Error('STALE_VERSION');
    await checkMenuPhotos(tx,id,content);
    const [open]=await tx`SELECT * FROM public.menu_revisions WHERE place_id=${id} AND status IN ('draft','pending','needs_info') FOR UPDATE`;
    const status=input.action==='submit'?'pending':'draft';
    let revision;
    if(open){
      if(open.id!==revisionId||Number(open.version)!==positiveVersion(input.revisionVersion))throw new Error('STALE_VERSION');
      if(open.status==='pending')throw new Error('PENDING_REVISION');
      if(!canEditMenuRevision({source:open.source,submitted_by:open.submitted_by,status:open.status,version:open.version},actor.admin,actor.user?.id??null))throw new Error('FORBIDDEN');
      [revision]=await tx`UPDATE public.menu_revisions SET content=${tx.json(content)},status=${status},version=version+1,
        base_version=${expectedVersion},updated_at=now(),submitted_at=CASE WHEN ${status}='pending' THEN now() ELSE submitted_at END
        WHERE id=${open.id} RETURNING *`;
    }else{
      if(revisionId)throw new Error('STALE_VERSION');
      [revision]=await tx`INSERT INTO public.menu_revisions(place_id,source,submitted_by,base_version,content,status,submitted_at)
        VALUES (${id},${actor.admin?'admin':'owner'},${actor.user?.id??null},${expectedVersion},${tx.json(content)},${status},CASE WHEN ${status}='pending' THEN now() ELSE NULL END) RETURNING *`;
    }
    await tx`INSERT INTO public.moderation_logs(actor_user_id,entity_type,entity_id,action,reason,before_data,after_data)
      VALUES (${actor.user?.id??null},'menu_revision',${revision.id},${status==='pending'?'menu_submitted':'menu_draft_saved'},'Menu content saved',${tx.json({content:open?.content??null})},${tx.json({placeId:id,revisionVersion:revision.version,content})})`;
    return {revision};
  });
}
export async function decideMenu(request:Request,id:string){
  if(!await isAdmin())throw new Error('FORBIDDEN');
  const input=parseMenuDecision(await readBody(request));
  if(!UUID.test(id))throw new Error('INVALID_REVISION');
  const note=input.note;
  return db().begin(async tx=>{
    const [ref]=await tx`SELECT place_id FROM public.menu_revisions WHERE id=${id}`;
    if(!ref)throw new Error('NOT_FOUND');
    const menu=await lockMenu(tx,ref.place_id,{admin:true,user:null});
    const [revision]=await tx`SELECT * FROM public.menu_revisions WHERE id=${id} FOR UPDATE`;
    assertMenuDecision({status:revision.status,version:revision.version},input);
    if(input.action==='approve'){
      if(Number(revision.base_version)!==Number(menu.version))throw new Error('STALE_VERSION');
      if(revision.source==='owner'){
        if(!revision.submitted_by||!await ownershipRole(tx,ref.place_id,revision.submitted_by))throw new Error('PERMISSION_REVOKED');
        await requireOwnerPlace(tx,ref.place_id,revision.submitted_by);
      }
      const content=parseMenu(revision.content);await checkMenuPhotos(tx,ref.place_id,content);
      await tx`UPDATE public.place_menus SET content=${tx.json(content)},version=version+1,hidden=false,published_at=now(),updated_at=now() WHERE place_id=${ref.place_id}`;
    }
    const status=input.action==='approve'?'approved':input.action==='reject'?'rejected':'needs_info';
    await tx`UPDATE public.menu_revisions SET status=${status},decision_note=${note||null},reviewed_at=now(),updated_at=now(),version=version+1 WHERE id=${id}`;
    await tx`INSERT INTO public.moderation_logs(entity_type,entity_id,action,reason,before_data,after_data)
      VALUES ('menu_revision',${id},${'menu_'+status},${note||'Admin approved menu'},${tx.json({status:revision.status,content:menu.content})},${tx.json({status,placeId:ref.place_id,content:revision.content})})`;
    return {status};
  });
}
export async function getPublicMenu(id:string){
  if(!UUID.test(id))return null;
  const [row]=await db()`SELECT m.content,m.published_at FROM public.place_menus m JOIN api.public_places p ON p.id=m.place_id
    WHERE m.place_id=${id} AND NOT m.hidden AND m.content IS NOT NULL`;
  if(!row)return null;
  const content=parseMenu(row.content);
  // Re-check image moderation so hiding an image also removes its menu reference.
  const ids=menuPhotoIds(content);
  const approved=ids.length?await db()`SELECT id FROM public.place_photos WHERE place_id=${id} AND id=ANY(${ids}::uuid[]) AND moderation_status='approved'`:[];
  const safe=new Set(approved.map(p=>String(p.id)));
  content.photoIds=content.photoIds.filter(p=>safe.has(p));
  content.groups=content.groups.map(g=>({...g,items:g.items.map(i=>({...i,photoId:i.photoId&&safe.has(i.photoId)?i.photoId:null}))}));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  const current=currentMenu(content,today);
  if(!current.groups.length&&!current.photoIds.length)return null;
  return {content:current,publishedAt:row.published_at};
}
