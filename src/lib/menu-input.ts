export type PriceType = 'fixed'|'from'|'range'|'free'|'contact';
export type MenuItem = { name:string; description:string; priceType:PriceType; priceMin:number|null; priceMax:number|null; unit:string; available:boolean; startDate:string; endDate:string; photoId:string|null };
export type MenuGroup = { name:string; kind:'menu'|'services'|'tickets'|'rooms'|'prices'; items:MenuItem[] };
export type MenuContent = { title:string; photoIds:string[]; groups:MenuGroup[] };
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('INVALID_INPUT');return v as Record<string,unknown>;}
function text(v:unknown,max:number,required=false){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v)||required&&!v.trim())throw new Error('INVALID_TEXT');return v.trim();}
function date(v:unknown){if(v==='')return '';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw new Error('INVALID_DATE');return v;}
function amount(v:unknown){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>1_000_000_000)throw new Error('INVALID_PRICE');return v;}
export function positiveVersion(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<1)throw new Error('INVALID_VERSION');return Number(v);}
export function parseMenu(value:unknown):MenuContent {
  const v=obj(value);
  if(!Array.isArray(v.photoIds)||v.photoIds.length>10||!v.photoIds.every(x=>typeof x==='string'&&UUID.test(x))||new Set(v.photoIds.map(x=>String(x).toLowerCase())).size!==v.photoIds.length)throw new Error('INVALID_PHOTOS');
  if(!Array.isArray(v.groups)||v.groups.length>20)throw new Error('INVALID_GROUPS');
  let count=0;
  const groups=v.groups.map(raw=>{
    const g=obj(raw);
    if(!['menu','services','tickets','rooms','prices'].includes(String(g.kind))||!Array.isArray(g.items)||!g.items.length)throw new Error('INVALID_GROUP');
    const items=g.items.map(rawItem=>{
      if(++count>200)throw new Error('INVALID_ITEM_LIMIT');
      const item=obj(rawItem);
      if(!['fixed','from','range','free','contact'].includes(String(item.priceType))||typeof item.available!=='boolean')throw new Error('INVALID_ITEM');
      const priceType=item.priceType as PriceType;
      const priceMin=['fixed','from','range'].includes(priceType)?amount(item.priceMin):null;
      const priceMax=priceType==='range'?amount(item.priceMax):null;
      if(priceMax!==null&&priceMin!==null&&priceMax<priceMin)throw new Error('INVALID_PRICE_RANGE');
      const startDate=date(item.startDate),endDate=date(item.endDate);
      if(startDate&&endDate&&startDate>endDate)throw new Error('INVALID_DATE_RANGE');
      const photoId=item.photoId===null?null:typeof item.photoId==='string'&&UUID.test(item.photoId)?item.photoId.toLowerCase():(()=>{throw new Error('INVALID_PHOTOS');})();
      return {name:text(item.name,160,true),description:text(item.description,500),priceType,priceMin,priceMax,unit:text(item.unit,40),available:item.available,startDate,endDate,photoId};
    });
    return {name:text(g.name,100,true),kind:g.kind as MenuGroup['kind'],items};
  });
  if(!groups.length&&!v.photoIds.length)throw new Error('INVALID_EMPTY_MENU');
  return {title:text(v.title,120,true),photoIds:(v.photoIds as string[]).map(id=>id.toLowerCase()),groups};
}
export function menuPhotoIds(content:MenuContent){return [...new Set([...content.photoIds,...content.groups.flatMap(g=>g.items.flatMap(i=>i.photoId?[i.photoId]:[]))])];}
export function formatPrice(item:MenuItem){
  const money=(n:number|null)=>(n??0).toLocaleString('vi-VN')+' đ';
  const price=item.priceType==='contact'?'Liên hệ':item.priceType==='free'?'Miễn phí':item.priceType==='from'?'Từ '+money(item.priceMin):item.priceType==='range'?money(item.priceMin)+' – '+money(item.priceMax):money(item.priceMin);
  return price+(item.unit?' / '+item.unit:'');
}
export function currentMenu(content:MenuContent,today:string):MenuContent {
  return {...content,groups:content.groups.map(g=>({...g,items:g.items.filter(i=>(!i.startDate||i.startDate<=today)&&(!i.endDate||i.endDate>=today))})).filter(g=>g.items.length)};
}
export type MenuRevisionRef={source:string;submitted_by:string|null;status:string;version:number};
export function canEditMenuRevision(revision:MenuRevisionRef|null|undefined,admin:boolean,userId:string|null){
  return !revision||(['draft','needs_info'].includes(revision.status)&&(admin?revision.source==='admin':revision.source==='owner'&&revision.submitted_by===userId&&userId!==null));
}
export function parseMenuDecision(value:unknown){
  const v=obj(value);if(!['approve','reject','needs_info'].includes(String(v.action)))throw new Error('INVALID_ACTION');
  const note=text(v.note??'',1200);if(v.action!=='approve'&&!note)throw new Error('INVALID_NOTE');
  return {action:v.action as 'approve'|'reject'|'needs_info',note,expectedVersion:positiveVersion(v.expectedVersion)};
}
export function assertMenuDecision(revision:{status:string;version:number},decision:{action:string;expectedVersion:number}){
  if(decision.action==='reject'?!['draft','pending','needs_info'].includes(revision.status):revision.status!=='pending')throw new Error('ALREADY_REVIEWED');
  if(Number(revision.version)!==decision.expectedVersion)throw new Error('STALE_VERSION');
}
