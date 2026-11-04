export type DashboardRange={start:string;end:string};
const DAY=86400000;
export function previousRange(range:DashboardRange){
  const days=(Date.parse(range.end)-Date.parse(range.start))/DAY+1;
  return {start:new Date(Date.parse(range.start)-days*DAY).toISOString().slice(0,10),end:new Date(Date.parse(range.start)-DAY).toISOString().slice(0,10)};
}
export function vietnamDate(value:Date|string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));}
export function trafficSummary(range:DashboardRange,startedAt:string|null,current:number,previous:number){
  const prior=previousRange(range);
  // The first measured day may be partial: do not invent an earlier full period.
  const firstFullDay=startedAt?new Date(Date.parse(vietnamDate(startedAt))+DAY).toISOString().slice(0,10):null;
  const comparable=!!firstFullDay&&prior.start>=firstFullDay;
  return {current,hasMeasuredDays:!!startedAt&&range.end>=vietnamDate(startedAt),previous:comparable?previous:null,previousRange:prior,comparable,
    percentChange:comparable&&previous>0?Math.round((current/previous-1)*1000)/10:null};
}
export function ratingSummary(rows:{stars:number;count:number}[]){
  const distribution=[5,4,3,2,1].map(stars=>({stars,count:rows.filter(r=>Number(r.stars)===stars).reduce((s,r)=>s+Number(r.count),0)}));
  const total=distribution.reduce((s,r)=>s+r.count,0);
  return {total,average:total?distribution.reduce((s,r)=>s+r.stars*r.count,0)/total:null,distribution};
}
export type MenuReminder = {state:'missing'|'outdated'|'current';lastPublishedAt:string|null;hidden:boolean};
export function menuReminder(menu:{has_content:boolean;published_at:Date|string|null;hidden:boolean}|null,now:Date):MenuReminder{
  if(!menu?.has_content||!menu.published_at)return {state:'missing',lastPublishedAt:null,hidden:menu?.hidden??false};
  const published=new Date(menu.published_at);
  return {state:now.getTime()-published.getTime()>=90*DAY?'outdated':'current',lastPublishedAt:published.toISOString(),hidden:menu.hidden};
}
