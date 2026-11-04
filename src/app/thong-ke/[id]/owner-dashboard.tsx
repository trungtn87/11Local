'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { DashboardRange,MenuReminder } from '@/lib/owner-dashboard';
import styles from './owner-dashboard.module.css';
type Data={
  place:{id:string;name:string;slug:string;role:string;visibility:string;moderation_status:string};range:DashboardRange;asOf:string;startedAt:string|null;
  traffic:{current:number;hasMeasuredDays:boolean;lifetime:number;previous:number|null;comparable:boolean;percentChange:number|null;previousRange:DashboardRange;daily:{day:string;views:number|null}[]};
  ratings:{total:number;average:number|null;distribution:{stars:number;count:number}[]};
  reviews:{id:string;stars:number;content:string;created_at:string}[];
  updates:{id:string;kind:string;status:string;decision_note:string|null;created_at:string}[];
  updateCounts:{kind:string;status:string;count:number}[];menu:MenuReminder;
};
const n=(value:number)=>value.toLocaleString('vi-VN');
const date=(value:string)=>new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const kindLabels:Record<string,string>={information:'Thông tin',photo:'Hình ảnh',menu:'Menu / bảng giá'};
const statusLabels:Record<string,string>={draft:'Bản nháp',pending:'Chờ duyệt',needs_info:'Cần bổ sung',approved:'Đã duyệt',rejected:'Từ chối / đã ẩn',superseded:'Đã thay thế'};
function preset(days:number){
  const end=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
  return {end,start:new Date(Date.parse(end)-(days-1)*86400000).toISOString().slice(0,10)};
}
export default function OwnerDashboard({placeId}:{placeId:string}){
  const [data,setData]=useState<Data|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  const [draft,setDraft]=useState<DashboardRange>({start:'',end:''});const [range,setRange]=useState<DashboardRange|null>(null);
  const [refresh,setRefresh]=useState(0);const [places,setPlaces]=useState<{id:string;name:string}[]>([]);
  useEffect(()=>{
    const ctl=new AbortController();
    const params=new URLSearchParams(range||{});
    fetch('/api/managed-places/'+placeId+'/dashboard?'+params,{signal:ctl.signal,cache:'no-store'})
      .then(async r=>{if(!r.ok)throw new Error(r.status===401?'Hãy đăng nhập Google để xem thống kê.':r.status===404?'Địa điểm không tồn tại hoặc bạn không còn quyền quản lý.':r.status===400?'Khoảng ngày không hợp lệ. Chọn tối đa 366 ngày và không chọn ngày tương lai.':'Chưa tải được thống kê. Hãy thử lại.');return r.json();})
      .then((body:Data)=>{if(ctl.signal.aborted)return;setData(body);setError('');setDraft(body.range);})
      .catch(e=>{if(!ctl.signal.aborted&&e.name!=='AbortError'){setData(null);setPlaces([]);setError(e.message);}})
      .finally(()=>{if(!ctl.signal.aborted)setLoading(false);});
    return()=>ctl.abort();
  },[placeId,range,refresh]);
  useEffect(()=>{
    const ctl=new AbortController();
    fetch('/api/me/managed-places',{signal:ctl.signal,cache:'no-store'}).then(r=>r.ok?r.json():{places:[]}).then(b=>{if(!ctl.signal.aborted)setPlaces((b.places||[]).map((p:{id:string;name:string})=>({id:p.id,name:p.name})));}).catch(()=>{});
    return()=>ctl.abort();
  },[refresh]);
  useEffect(()=>{
    const reload=()=>{if(document.visibilityState==='visible')setRefresh(v=>v+1);};
    const timer=setInterval(reload,60000);window.addEventListener('focus',reload);document.addEventListener('visibilitychange',reload);
    return()=>{clearInterval(timer);window.removeEventListener('focus',reload);document.removeEventListener('visibilitychange',reload);};
  },[]);
  const apply=(value:DashboardRange)=>{setLoading(true);setError('');setRange(value);};
  const max=Math.max(1,...(data?.traffic.daily.map(d=>d.views??0)||[]));
  return <main className={styles.shell}>
    <header><div><Link href="/quan-ly">← Địa điểm của tôi</Link><h1>Thống kê địa điểm</h1><h2>{data?.place.name}</h2></div><button disabled={loading} onClick={()=>{setLoading(true);setRefresh(v=>v+1);}}>Làm mới</button></header>
    {places.length>1&&<nav className={styles.places} aria-label="Địa điểm đang quản lý">{places.map(p=><Link key={p.id} aria-current={p.id===placeId?'page':undefined} href={'/thong-ke/'+p.id}>{p.name}</Link>)}</nav>}
    <form className={styles.filters} onSubmit={e=>{e.preventDefault();apply({...draft});}}>
      <label>Từ ngày<input required type="date" value={draft.start} onChange={e=>setDraft({...draft,start:e.target.value})}/></label>
      <label>Đến ngày<input required type="date" value={draft.end} onChange={e=>setDraft({...draft,end:e.target.value})}/></label>
      <button disabled={loading}>Áp dụng</button>{[1,7,30].map(days=><button disabled={loading} type="button" key={days} onClick={()=>apply(preset(days))}>{days===1?'Hôm nay':days+' ngày'}</button>)}
    </form>
    {loading&&<p role="status">Đang tải thống kê…</p>}
    {error&&<div className={styles.notice} role="alert"><p>{error}</p><Link href={'/dang-nhap?returnTo='+encodeURIComponent('/thong-ke/'+placeId)}>Đăng nhập Google</Link></div>}
    {data&&!error&&<>
      <p className={styles.meta}>Số liệu đến {new Date(data.asOf).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · Vai trò: {data.place.role==='owner'?'Chủ địa điểm':'Người quản lý'}.</p>
      {data.place.visibility!=='visible'||data.place.moderation_status!=='approved'?<p className={styles.notice}>Địa điểm hiện chưa công khai. Bạn vẫn có thể xem dữ liệu quản lý của mình.</p>:null}
      <div className={styles.actions}><Link href={'/quan-ly/'+placeId}>Sửa thông tin và ảnh</Link><Link href={'/quan-ly-menu/'+placeId}>Quản lý menu / bảng giá</Link><Link href={'/dia-diem/'+data.place.slug}>Xem trang công khai</Link></div>
      <div className={styles.cards}>
        <section><strong>{data.traffic.hasMeasuredDays?n(data.traffic.current):'—'}</strong><h3>Lượt xem trong kỳ</h3><small>{data.range.start} – {data.range.end}</small></section>
        <section><strong>{data.traffic.percentChange===null?'—':(data.traffic.percentChange>0?'+':'')+data.traffic.percentChange+'%'}</strong><h3>So với kỳ trước</h3><small>{data.traffic.comparable?'Kỳ trước: '+n(data.traffic.previous??0)+' lượt xem'+(data.traffic.previous===0?' · Chưa có cơ sở tính phần trăm':''):'Chưa đủ lịch sử để so sánh'}</small></section>
        <section><strong>{n(data.traffic.lifetime)}</strong><h3>Tổng lượt xem</h3><small>Bao gồm bộ đếm có trước khi ghi nhận theo ngày</small></section>
        <section><strong>{data.ratings.average===null?'—':data.ratings.average.toFixed(1)+'/5'}</strong><h3>Điểm đánh giá</h3><small>{n(data.ratings.total)} đánh giá đang công khai</small></section>
      </div>
      <section className={styles.panel}><h2>Lượt xem theo ngày</h2><p>Bộ lọc ngày áp dụng cho lượt xem. Đánh giá và trạng thái cập nhật bên dưới phản ánh dữ liệu hiện tại.</p>
        <div className={styles.chart} aria-label="Biểu đồ lượt xem">{data.traffic.daily.map(d=><div key={d.day} title={d.day+': '+(d.views===null?'Chưa ghi nhận':n(d.views)+' lượt xem')}>
          <div className={styles.barTrack}>{d.views!==null&&<i style={{height:(d.views/max*100)+'%'}}/>}</div><small>{d.day.slice(5)}</small>
        </div>)}</div>
        <details><summary>Xem bảng số liệu theo ngày</summary><table><thead><tr><th>Ngày</th><th>Lượt xem</th></tr></thead><tbody>{data.traffic.daily.map(d=><tr key={d.day}><td>{d.day}</td><td>{d.views===null?'Chưa ghi nhận':n(d.views)}</td></tr>)}</tbody></table></details>
        <p className={styles.meta}>{data.startedAt?'Ghi nhận theo ngày từ '+date(data.startedAt)+'. Ngày đầu và ngày hiện tại có thể chưa đủ 24 giờ.':'Chưa có mốc ghi nhận theo ngày.'} Lượt xem không phải số người xem duy nhất.</p>
      </section>
      <section className={styles.reminder}><h2>Menu và bảng giá</h2><p>{data.menu.state==='missing'?'Địa điểm chưa có menu / bảng giá đã duyệt.':data.menu.state==='outdated'?'Bảng giá đã quá 90 ngày chưa cập nhật. Hãy kiểm tra và gửi bản mới nếu giá thay đổi.':'Bảng giá đã được cập nhật trong 90 ngày qua.'}</p>{data.menu.lastPublishedAt&&<small>Cập nhật lần cuối: {date(data.menu.lastPublishedAt)}{data.menu.hidden?' · Menu đang ẩn':''}</small>}<Link href={'/quan-ly-menu/'+placeId}>Kiểm tra menu và bảng giá →</Link></section>
      <div className={styles.columns}>
        <section className={styles.panel}><h2>Phân bố đánh giá công khai</h2>{data.ratings.distribution.map(r=><div className={styles.rating} key={r.stars}><span>{r.stars} sao</span><meter min={0} max={Math.max(1,data.ratings.total)} value={r.count} aria-label={r.stars+' sao'}/><strong>{n(r.count)}</strong></div>)}{!data.ratings.total&&<p>Chưa có đánh giá công khai.</p>}</section>
        <section className={styles.panel}><h2>Cập nhật bạn đã gửi</h2>{['information','photo','menu'].map(kind=><div key={kind}><h3>{kindLabels[kind]}</h3><p>{data.updateCounts.filter(v=>v.kind===kind).map(v=>`${statusLabels[v.status]||v.status}: ${n(v.count)}`).join(' · ')||'Chưa gửi cập nhật.'}</p></div>)}</section>
      </div>
      <section className={styles.panel}><h2>Đánh giá công khai gần nhất</h2>{data.reviews.length?data.reviews.map(r=><article key={r.id}><strong>{r.stars}/5 sao</strong><small> · {date(r.created_at)}</small><p>{r.content||'Người dùng chỉ đánh giá sao.'}</p></article>):<p>Chưa có đánh giá công khai.</p>}</section>
      <section className={styles.panel}><h2>Lịch sử gửi cập nhật gần nhất</h2>{data.updates.length?<div className={styles.tableWrap}><table><thead><tr><th>Nội dung</th><th>Ngày gửi</th><th>Trạng thái</th><th>Phản hồi Admin</th></tr></thead><tbody>{data.updates.map(u=><tr key={u.kind+u.id}><td><Link href={u.kind==='menu'?'/quan-ly-menu/'+placeId:'/quan-ly/'+placeId}>{kindLabels[u.kind]}</Link></td><td>{date(u.created_at)}</td><td>{statusLabels[u.status]||u.status}</td><td>{u.decision_note||'—'}</td></tr>)}</tbody></table></div>:<p>Bạn chưa gửi cập nhật cho địa điểm này.</p>}</section>
    </>}
  </main>;
}
