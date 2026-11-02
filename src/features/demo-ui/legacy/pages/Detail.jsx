import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Phone, Navigation, Share2, Clock, MapPin, Wallet, Star, Camera, Flag, Store, Images, ChevronLeft, ChevronRight, X, Utensils, PencilLine, Trash2 } from 'lucide-react';
import { useApp } from '../store.jsx';
import { byId, catLabel, reviewsByPlace } from '../data/demo.js';
import { PlaceArt, DefaultImage, Rating, ManageBadge, OpBadge, Button, Banner, StateBlock, Tabs, Sheet, Field, DemoBadge } from '../components/ui.jsx';
import { MapView } from '../components/MapView.jsx';

function photosOf(p) {
  const mk = (n, src) => Array.from({ length: n }, (_, i) => ({ id: `${src}${i}`, src, kind: p.art.kind, seed: p.art.seed + i * 3 + (src === 'c' ? 1 : 0) }));
  return { official: mk(p.photos.official, 'o'), community: mk(p.photos.community, 'c') };
}

function Lightbox({ list, index, onClose, setIndex }) {
  if (index == null) return null;
  const ph = list[index];
  return (
    <div className="overlay lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="row between" style={{ width: 'min(100%,960px)' }}>
        <span className="small">{index + 1} / {list.length} · {ph.src === 'o' ? 'Ảnh chính thức' : 'Ảnh cộng đồng'}</span>
        <button className="btn btn-icon btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }} aria-label="Đóng" onClick={onClose}><X size={18} /></button>
      </div>
      <PlaceArt kind={ph.kind} seed={ph.seed} />
      <div className="row">
        <Button variant="outline" size="sm" icon={ChevronLeft} disabled={index === 0} onClick={() => setIndex(index - 1)}>Trước</Button>
        <Button variant="outline" size="sm" disabled={index === list.length - 1} onClick={() => setIndex(index + 1)}>Sau <ChevronRight size={16} /></Button>
      </div>
    </div>
  );
}

function ReviewSheet({ open, onClose, place }) {
  const { role, myReviews, setMyReviews, toast } = useApp();
  const nav = useNavigate();
  const [stars, setStars] = useState(0); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const mine = myReviews[place.id];
  if (role === 'guest') return (
    <Sheet open={open} onClose={onClose} title="Viết đánh giá">
      <StateBlock kind="restricted" title="Cần đăng nhập và xác minh SĐT" actions={<><Button onClick={() => nav('/dang-nhap')}>Đăng nhập bằng SĐT</Button><Button variant="outline" onClick={onClose}>Để sau</Button></>}>Đánh giá sao yêu cầu tài khoản có số điện thoại đã xác minh. Bạn vẫn có thể xem mọi đánh giá.</StateBlock>
    </Sheet>
  );
  if (role === 'owner' && place.managed && place.id === 'p1') return (
    <Sheet open={open} onClose={onClose} title="Viết đánh giá"><Banner type="info">Tài khoản quản lý không tự đánh giá địa điểm mình quản lý.</Banner></Sheet>
  );
  const submit = () => {
    if (!stars) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); setMyReviews((m) => ({ ...m, [place.id]: { stars, text, status: 'pending' } })); toast('Đã gửi (mô phỏng) — đánh giá chờ Admin duyệt', 'success'); onClose(); }, 700);
  };
  return (
    <Sheet open={open} onClose={onClose} title={mine ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}>
      <div className="stack">
        <Field label="Chấm sao" required>
          <div className="rating-input" role="radiogroup" aria-label="Chấm sao 1 đến 5">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={stars === n} aria-label={`${n} sao`} className={stars >= n ? 'on' : ''} onClick={() => setStars(n)}><Star /></button>)}
          </div>
        </Field>
        <Field label="Nhận xét (tùy chọn)" htmlFor="rv-text" hint="Hiển thị bằng biệt danh. SĐT của bạn không được công khai."><textarea id="rv-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Chia sẻ trải nghiệm của bạn…" /></Field>
        <Banner type="info">Đánh giá mới đi qua hàng chờ Admin. Mỗi tài khoản chỉ có một đánh giá đang hoạt động cho mỗi địa điểm.</Banner>
        <Button loading={busy} disabled={!stars} onClick={submit} block>Gửi đánh giá</Button>
      </div>
    </Sheet>
  );
}

export function PlaceDetail() {
  const { id } = useParams();
  const { hiddenIds, role, toast, myReviews, setMyReviews } = useApp();
  const p = byId(id);
  const [tab, setTab] = useState('official');
  const [lb, setLb] = useState(null);
  const [rv, setRv] = useState(false);
  const [more, setMore] = useState(false);
  const nav = useNavigate();

  if (!p || hiddenIds.includes(p.id)) return (
    <div className="container page"><StateBlock kind="empty" title="Không tìm thấy địa điểm" actions={<Button onClick={() => nav('/tim-kiem')}>Về danh sách</Button>}>Địa điểm không tồn tại hoặc không còn hiển thị công khai. (Địa điểm bị ẩn không xem được qua đường dẫn trực tiếp.)</StateBlock></div>
  );

  const ph = photosOf(p);
  const all = [...ph.official, ...ph.community];
  const reviews = reviewsByPlace[p.id] || [];
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.stars === s).length }));
  const mine = myReviews[p.id];
  const tabs = [{ id: 'official', label: `Ảnh chính thức (${ph.official.length})` }, { id: 'community', label: `Ảnh cộng đồng (${ph.community.length})` }, ...(p.menu ? [{ id: 'menu', label: 'Thực đơn' }] : [])];
  const share = () => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/dia-diem/${p.id}`).catch(() => {}); toast('Đã sao chép đường dẫn cố định của địa điểm', 'success'); };
  const call = () => toast('Mở trình gọi điện (mô phỏng) — không tự quay số', 'info');
  const dir = () => toast('Mở ứng dụng bản đồ ngoài với tọa độ đích (mô phỏng)', 'info');

  const Actions = ({ block }) => (
    <div className="row-wrap" style={block ? { flexWrap: 'nowrap' } : undefined}>
      {p.phone && <Button icon={Phone} onClick={call} block={block}>Gọi</Button>}
      <Button variant={p.phone ? 'outline' : 'primary'} icon={Navigation} onClick={dir} block={block}>Chỉ đường</Button>
      {!block && <Button variant="outline" icon={Share2} onClick={share}>Chia sẻ</Button>}
    </div>
  );

  return (
    <div className="container page stack-lg" style={{ paddingBottom: 100 }}>
      <nav aria-label="Đường dẫn" className="small muted row" style={{ gap: 6 }}><Link to="/tim-kiem">Địa điểm</Link><ChevronRight size={14} /><span>{catLabel(p.cat)}</span></nav>

      {/* 1. Ảnh đầu trang */}
      <section className="gallery-hero" aria-label="Ảnh địa điểm">
        <div className="g-main" onClick={() => all.length && setLb(0)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && all.length && setLb(0)} aria-label="Mở album ảnh">
          {all.length ? <PlaceArt kind={p.art.kind} seed={p.art.seed} /> : <DefaultImage />}
          {all.length > 0 && <button className="g-count" onClick={(e) => { e.stopPropagation(); setLb(0); }}><Images size={14} /> {all.length} ảnh</button>}
        </div>
        {[1, 2].map((i) => <div key={i} className="g-side" onClick={() => all[i] && setLb(i)}>{all[i] ? <PlaceArt kind={all[i].kind} seed={all[i].seed} label={false} /> : <DefaultImage />}</div>)}
      </section>

      <div className="detail-layout">
        <div className="stack-lg">
          {/* 2. Tóm tắt */}
          <section className="stack-sm" aria-labelledby="pn">
            <div className="row-wrap"><span className="badge badge-neutral">{catLabel(p.cat)}</span><ManageBadge managed={p.managed} /><OpBadge op={p.op} /></div>
            <h1 id="pn" style={{ fontSize: 'var(--fs-3xl)' }}>{p.name}</h1>
            <div className="row"><Rating rating={p.rating} /><span className="small muted">· {p.area}</span></div>
            {p.op === 'temp-closed' && <Banner type="warning">Địa điểm đang <b>tạm đóng</b>. Thông tin có thể chưa cập nhật.</Banner>}
            <div className="hide-mobile"><Actions /></div>
            <div className="hide-desktop row-wrap"><Button variant="outline" size="sm" icon={Share2} onClick={share}>Chia sẻ</Button></div>
          </section>

          {/* 4. Thông tin cơ bản */}
          <section className="card info-list" aria-label="Thông tin cơ bản">
            <div className="info-row"><MapPin size={20} /><div><b>Địa chỉ</b><div className="text-2">{p.address}, {p.area}</div></div></div>
            <div className="info-row"><Clock size={20} /><div><b>Giờ mở cửa</b><div className={p.hours ? 'text-2' : 'muted'}>{p.hours || 'Chưa có thông tin giờ mở cửa'}</div></div></div>
            <div className="info-row"><Wallet size={20} /><div><b>Khoảng giá</b><div className={p.price ? 'text-2' : 'muted'}>{p.price ? `${p.price} (tham khảo)` : 'Chưa rõ'}</div></div></div>
            <div className="info-row"><Phone size={20} /><div><b>Điện thoại</b><div className={p.phone ? 'text-2' : 'muted'}>{p.phone || 'Chưa có số điện thoại — nút Gọi được ẩn'}</div></div></div>
            <p className="text-2" style={{ borderTop: '1px solid var(--c-border)', paddingTop: 12 }}>{p.desc}</p>
            <div className="xs muted">Cập nhật {p.updated} · <DemoBadge>demo</DemoBadge></div>
          </section>

          {/* 5. Vị trí */}
          <section aria-label="Vị trí"><h2 className="section-head">Vị trí</h2>
            <MapView places={[p]} selectedId={null} height={200} />
            <div className="small text-2" style={{ marginTop: 8 }}>{p.address}, {p.area}</div>
          </section>

          {/* 6. Ảnh và thực đơn */}
          <section aria-label="Ảnh và thực đơn" className="stack-sm">
            <h2>Ảnh{p.menu ? ' & thực đơn' : ''}</h2>
            <Tabs tabs={tabs} value={tab} onChange={setTab} label="Ảnh và thực đơn" />
            {tab !== 'menu' ? (
              (tab === 'official' ? ph.official : ph.community).length ? (
                <div className="thumb-grid">{(tab === 'official' ? ph.official : ph.community).map((x) => <button key={x.id} aria-label="Xem ảnh" onClick={() => setLb(all.findIndex((a) => a.id === x.id))}><PlaceArt kind={x.kind} seed={x.seed} label={false} /></button>)}</div>
              ) : <StateBlock kind="empty" title={tab === 'official' ? 'Chưa có ảnh chính thức' : 'Chưa có ảnh cộng đồng'} actions={<Button variant="outline" size="sm" icon={Camera} onClick={() => nav(`/bao-sai/${p.id}?loai=anh`)}>Gửi ảnh</Button>}>Ảnh gửi lên sẽ hiển thị sau khi Admin duyệt.</StateBlock>
            ) : (
              <div className="card-flat stack-sm"><div className="row"><Utensils size={18} /><b>Ảnh thực đơn / bảng giá</b></div><div style={{ aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden' }}><PlaceArt kind="food" seed={p.art.seed + 5} label /></div><div className="xs muted">Cập nhật {p.updated}. Giá chỉ để tham khảo, không cam kết còn món.</div></div>
            )}
          </section>

          {/* 7. Đánh giá */}
          <section aria-label="Đánh giá" className="stack">
            <div className="row between"><h2>Đánh giá</h2><Button size="sm" variant="outline" icon={Star} onClick={() => setRv(true)}>{mine ? 'Sửa đánh giá' : 'Viết đánh giá'}</Button></div>
            {mine && <Banner type="info" title="Đánh giá của bạn đang chờ duyệt.">Bản cũ hợp lệ (nếu có) vẫn hiển thị trong lúc chờ. <button className="btn btn-ghost btn-sm" onClick={() => { setMyReviews((m) => { const n = { ...m }; delete n[p.id]; return n; }); toast('Đã rút đánh giá (mô phỏng)', 'info'); }}>Rút đánh giá</button></Banner>}
            {p.rating ? (
              <div className="card row" style={{ gap: 'var(--s-6)', alignItems: 'center' }}>
                <div className="center"><div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{p.rating.avg.toFixed(1)}</div><Rating rating={{ avg: p.rating.avg, count: p.rating.count }} compact /><div className="xs muted">{p.rating.count} đánh giá · demo</div></div>
                <div className="grow stack-sm">{dist.map((d) => <div key={d.s} className="bar-row"><span>{d.s}</span><div className="bar"><i style={{ width: `${reviews.length ? (d.n / reviews.length) * 100 : 0}%` }} /></div><span>{d.n}</span></div>)}</div>
              </div>
            ) : <div className="card-flat center"><b>Chưa có đánh giá</b><div className="small text-2">Hãy là người đầu tiên chia sẻ trải nghiệm.</div></div>}
            {reviews.length > 0 && <div>{(more ? reviews : reviews.slice(0, 2)).map((r) => (
              <article key={r.id} className="review">
                <div className="row"><span className="avatar">{r.user.slice(-1)}</span><div className="grow"><b>{r.user}</b><div className="xs muted">{r.date}</div></div><span className="rating"><Star size={14} fill="currentColor" /> {r.stars}</span></div>
                <p className="text-2" style={{ marginTop: 8 }}>{r.text}</p>
                {r.reply && <div className="reply"><b>Phản hồi từ quản lý</b><div>{r.reply}</div></div>}
              </article>))}
              {reviews.length > 2 && <Button variant="ghost" onClick={() => setMore(!more)}>{more ? 'Thu gọn' : `Xem thêm ${reviews.length - 2} đánh giá`}</Button>}
            </div>}
          </section>
        </div>

        {/* 8. Đóng góp & quyền */}
        <aside className="detail-aside stack">
          <div className="card stack-sm hide-mobile"><Actions block /><div className="xs muted">Gọi mở trình gọi điện, không tự quay số. Chỉ đường mở ứng dụng bản đồ ngoài.</div></div>
          <section className="card stack-sm" aria-label="Đóng góp và quyền">
            <h3>Giúp cập nhật địa điểm này</h3>
            <Button variant="outline" icon={Flag} block onClick={() => nav(`/bao-sai/${p.id}`)}>Báo sai / đề xuất sửa</Button>
            <Button variant="outline" icon={Camera} block onClick={() => nav(`/bao-sai/${p.id}?loai=anh`)}>Gửi ảnh</Button>
            <Button variant="ghost" icon={Store} block onClick={() => nav(`/nhan-quyen/${p.id}`)}>Đây là địa điểm tôi quản lý</Button>
            <p className="xs muted">Nhãn “Đã xác minh quản lý” nói về quyền quản lý, không bảo chứng chất lượng quán. Mọi đề xuất chờ Admin duyệt; bản công khai hiện hành được giữ cho tới khi có quyết định.</p>
          </section>
        </aside>
      </div>

      <div className="sticky-actions hide-desktop"><Actions block /></div>
      <Lightbox list={all} index={lb} onClose={() => setLb(null)} setIndex={setLb} />
      <ReviewSheet open={rv} onClose={() => setRv(false)} place={p} />
    </div>
  );
}
