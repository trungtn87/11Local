'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
type Data = {
  range: {start:string; end:string}; queue: {contributions:number; needs_info:number; reviews:number};
  menus: {published:number; outdated:number; pending:number};
  places: { total:number; published:number; hidden:number; pending:number; verified:number };
  contributions: { kind:string; status:string; count:number }[];
  reviews: { status:string; stars:number; count:number }[];
  daily: { day:string; visits:number; views:number }[];
  top: { id:string; name:string; slug:string; views:number }[];
  visits: { current:number; previous:number };
  categories: { id:string; name:string }[]; startedAt:string;
};
const n = (v:number) => v.toLocaleString('vi-VN');
const kinds:Record<string,string> = { new_place:'Địa điểm mới', edit_place:'Đề xuất sửa', report:'Báo sai', photo:'Ảnh cộng đồng' };
export default function Dashboard() {
  const [data,setData] = useState<Data|null>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [query,setQuery] = useState('');
  const [revision,setRevision] = useState(0);
  const [start,setStart] = useState(''); const [end,setEnd] = useState('');
  const [category,setCategory] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/dashboard?' + query,{ signal:controller.signal, cache:'no-store' })
      .then(async r => { if (!r.ok) throw new Error(r.status === 401 ? 'Hãy đăng nhập Admin trước khi mở Dashboard.' : r.status === 400 ? 'Khoảng ngày không hợp lệ (tối đa 366 ngày, không chọn ngày tương lai).' : 'Chưa tải được dữ liệu thống kê.'); return r.json(); })
      .then(body => { setData(body); setError(''); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[query,revision]);
  const apply = (days?:number) => {
    const params = new URLSearchParams();
    if (days) {
      const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
      params.set('end',today); params.set('start',new Date(Date.parse(today) - (days-1)*86400000).toISOString().slice(0,10));
    } else { if(start) params.set('start',start); if(end) params.set('end',end); }
    if(category) params.set('category',category);
    setLoading(true); setError(''); setQuery(params.toString()); setRevision(v=>v+1);
  };
  const approved = data?.reviews.filter(r=>r.status==='approved') || [];
  const count = approved.reduce((s,r)=>s+r.count,0);
  const avg = count ? approved.reduce((s,r)=>s+r.count*r.stars,0)/count : 0;
  const max = Math.max(1,...(data?.daily.map(d=>Math.max(d.visits,d.views)) || []));
  return <main className={styles.shell}>
    <header><div><Link href="/admin">← Quản trị địa điểm</Link><h1>Dashboard 11Local</h1><p>Tổng quan dữ liệu và hoạt động cộng đồng</p></div><Link href="/">Mở trang chủ</Link></header>
    <form className={styles.filters} onSubmit={e=>{e.preventDefault();apply();}}>
      <label>Từ ngày<input aria-label="Từ ngày" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
      <label>Đến ngày<input aria-label="Đến ngày" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      <label>Danh mục<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{data?.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <button disabled={loading}>Áp dụng</button>
      {[1,7,30].map(d=><button key={d} type="button" disabled={loading} onClick={()=>apply(d)}>{d===1?'Hôm nay':d+' ngày'}</button>)}
    </form>
    {loading && <p role="status">Đang tải thống kê…</p>}
    {error && <p role="alert">{error} <Link href="/admin">Đến trang Admin</Link></p>}
    {data && !error && <>
      <p>Hoạt động từ {data.range.start} đến {data.range.end} · Múi giờ Việt Nam. Số địa điểm phản ánh trạng thái hiện tại.</p>
      <div className={styles.cards}>
        <Link href="/admin"><strong>{n(data.places.total)}</strong>Địa điểm<small>{n(data.places.published)} công khai · {n(data.places.hidden)} đang ẩn · {n(data.places.verified)} xác minh chủ</small></Link>
        <a href="#traffic"><strong>{n(data.visits.current)}</strong>Lượt truy cập website<small>Kỳ trước: {n(data.visits.previous)}{data.visits.previous>0 ? ' · '+((data.visits.current/data.visits.previous-1)*100).toFixed(1)+'%' : ' · Chưa có cơ sở so sánh'}</small></a>
        <Link href="/admin/dong-gop"><strong>{n(data.contributions.reduce((s,c)=>s+c.count,0))}</strong>Đóng góp được gửi<small>Trong khoảng ngày đã chọn</small></Link>
        <Link href="/admin/danh-gia"><strong>{count ? avg.toFixed(1)+'/5' : '—'}</strong>Điểm đánh giá trung bình<small>{n(count)} đánh giá công khai được gửi trong kỳ</small></Link>
      </div>
      <section id="traffic"><h2>Lượt truy cập và lượt xem địa điểm</h2><p>Lượt truy cập website áp dụng cho toàn website. Lượt xem địa điểm áp dụng bộ lọc danh mục.</p>
        <div className={styles.chart} aria-label="Thống kê theo ngày">{data.daily.map(d=><div key={d.day} title={`${d.day}: ${n(d.visits)} truy cập, ${n(d.views)} lượt xem`}>
          <div className={styles.bars}><i style={{height:(d.visits/max*100)+'%'}}/><b style={{height:(d.views/max*100)+'%'}}/></div><small>{d.day.slice(5,10)}</small>
        </div>)}</div><p>🟢 Truy cập website · 🔵 Xem địa điểm</p>
        <details><summary>Xem bảng số liệu theo ngày</summary><table><thead><tr><th>Ngày</th><th>Truy cập</th><th>Xem địa điểm</th></tr></thead><tbody>{data.daily.map(d=><tr key={d.day}><td>{d.day.slice(0,10)}</td><td>{n(d.visits)}</td><td>{n(d.views)}</td></tr>)}</tbody></table></details>
      </section>
      <div className={styles.columns}>
        <section><h2>Địa điểm được xem nhiều</h2>{data.top.length ? <ol>{data.top.map(p=><li key={p.id}><Link href={'/dia-diem/'+p.slug}>{p.name}</Link><strong>{n(p.views)}</strong></li>)}</ol> : <p>Chưa ghi nhận lượt xem trong kỳ.</p>}</section>
        <section><h2>Đóng góp trong kỳ</h2><table><thead><tr><th>Loại</th><th>Trạng thái</th><th>Số lượng</th></tr></thead><tbody>{data.contributions.map(c=><tr key={c.kind+c.status}><td>{kinds[c.kind]||c.kind}</td><td>{{pending:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',needs_info:'Cần bổ sung'}[c.status]||c.status}</td><td>{n(c.count)}</td></tr>)}</tbody></table>{!data.contributions.length && <p>Chưa có đóng góp trong kỳ.</p>}</section>
        <section><h2>Menu và bảng giá</h2><p>Đã duyệt, đang hiện: {n(data.menus.published)}</p><p>Chờ duyệt: {n(data.menus.pending)}</p><p>Quá 90 ngày chưa cập nhật: {n(data.menus.outdated)}</p><Link href="/admin/menu">Quản lý menu và bảng giá</Link></section>
        <section><h2>Phân bố đánh giá công khai</h2>{[5,4,3,2,1].map(star=><p key={star}>{star} sao <strong>{n(approved.filter(r=>r.stars===star).reduce((s,r)=>s+r.count,0))}</strong></p>)}</section>
        <section><h2>Cần xử lý · Toàn hệ thống</h2><p><Link href="/admin">Địa điểm chờ duyệt: {n(data.places.pending)}</Link></p><p><Link href="/admin/dong-gop">Đóng góp chờ duyệt: {n(data.queue.contributions)}</Link></p><p><Link href="/admin/danh-gia">Đánh giá và bản sửa chờ duyệt: {n(data.queue.reviews)}</Link></p><p><Link href="/admin/xac-minh">Xác minh chủ địa điểm</Link></p><p><Link href="/admin/noi-dung-chu">Duyệt nội dung chủ quán</Link></p></section>
      </div>
      <p className={styles.note}>Bắt đầu ghi nhận lượt truy cập và lượt xem theo ngày: {new Date(data.startedAt).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}. Lượt xem cũ của địa điểm được giữ nguyên; không suy diễn lịch sử theo ngày. Không ghi nhận bot nhận diện được hoặc phiên Admin.</p>
    </>}
  </main>;
}
