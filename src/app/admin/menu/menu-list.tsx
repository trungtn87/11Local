'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import styles from '@/components/menu/menu.module.css';
type Place={id:string;name:string;published_at:string|null;hidden:boolean|null;revision_status:string|null};
export default function MenuList(){
  const [places,setPlaces]=useState<Place[]>([]);const [loaded,setLoaded]=useState(false);const [error,setError]=useState('');const [query,setQuery]=useState('');
  useEffect(()=>{const ctl=new AbortController();fetch('/api/admin/menus',{signal:ctl.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error(r.status===401?'Hãy đăng nhập Admin.':'Chưa tải được dữ liệu.');return r.json();}).then(b=>{setPlaces(b.places);setLoaded(true);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>ctl.abort();},[]);
  return <main className={styles.editor}><Link href="/admin">← Quản trị</Link><h1>Menu và bảng giá</h1><p>Chọn địa điểm để nhập menu, sửa giá hoặc duyệt nội dung chủ quán.</p>{error&&<p role="alert">{error} <Link href="/admin">Đăng nhập Admin</Link></p>}
    <label>Tìm địa điểm<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên địa điểm"/></label>
    {!loaded&&!error&&<p>Đang tải…</p>}{loaded&&!places.length&&<p>Chưa có địa điểm.</p>}
    {places.filter(p=>p.name.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN'))).map(p=><section className={styles.group} key={p.id}><Link href={'/admin/menu/'+p.id}><strong>{p.name}</strong></Link><p>{p.published_at?(p.hidden?'Menu đang ẩn':'Đã có menu công khai'):'Chưa có menu'}{p.revision_status&&' · '+({draft:'Có bản nháp',pending:'Chờ duyệt',needs_info:'Cần bổ sung'}[p.revision_status]||p.revision_status)}</p></section>)}
  </main>;
}
