'use client';
import { useEffect,useState } from 'react';
import type { MenuContent } from '@/lib/menu-input';
import { MenuView } from './menu-view';
export function PublicMenu({placeId}:{placeId:string}){
  const [state,setState]=useState<{id:string;menu:{content:MenuContent;publishedAt:string}|null;error:boolean}|null>(null);
  useEffect(()=>{
    const ctl=new AbortController();
    fetch('/api/menus/'+placeId,{signal:ctl.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();})
      .then(b=>setState({id:placeId,menu:b.menu,error:false})).catch(e=>{if(e.name!=='AbortError')setState({id:placeId,menu:null,error:true});});
    return()=>ctl.abort();
  },[placeId]);
  if(state?.id!==placeId)return <p role="status">Đang tải menu / bảng giá…</p>;
  if(state.error)return <p>Chưa tải được menu / bảng giá.</p>;
  return state.menu?<MenuView content={state.menu.content} publishedAt={state.menu.publishedAt}/>:null;
}
