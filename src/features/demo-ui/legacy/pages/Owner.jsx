import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, Phone, Navigation, ExternalLink, Clock, Camera, MessageSquareReply, Flag, Lock, Upload, Trash2, Info } from 'lucide-react';
import { useApp } from '../store.jsx';
import { byId, ownerStats, reviewsByPlace } from '../data/demo.js';
import { MgmtShell } from '../components/layout.jsx';
import { Button, Banner, Field, StateBlock, StatusBadge, OpBadge, ManageBadge, PlaceArt, Tabs, DemoBadge, Rating } from '../components/ui.jsx';

export function Gate({ role, need, children }) {
  const nav = useNavigate();
  if (role !== need) return <div className="container page"><StateBlock kind="restricted" title="Bạn không có quyền xem trang này" actions={<><Button onClick={() => nav('/')}>Về trang chủ</Button></>}>Đây là khu {need === 'owner' ? 'quản lý địa điểm' : 'quản trị'}. Trong bản xem trước, hãy dùng nút <b>Công cụ xem trước</b> (góc dưới) để chuyển vai trò giao diện. Việc phân quyền thật sẽ do máy chủ thực hiện.</StateBlock></div>;
  return children;
}

/* ===================== Dashboard chủ địa điểm ===================== */
export function OwnerDashboard() {
  const { role } = useApp();
  const [range, setRange] = useState('7');
  const my = ['p1', 'p3'].map(byId);
  const [sel, setSel] = useState('p1');
  const p = byId(sel);
  const s = ownerStats;
  const max = Math.max(...s.daily);
  const reviews = reviewsByPlace[sel] || [];
  return (
    <Gate role={role} need="owner">
      <MgmtShell kind="owner">
        <div className="stack-lg">
          <section className="card stack-sm">
            <h2>Địa điểm bạn được cấp quyền</h2>
            <div className="row-wrap">{my.map((m) => <button key={m.id} className="chip" aria-pressed={sel === m.id} onClick={() => setSel(m.id)}>{m.name}</button>)}</div>
            <div className="row-wrap"><OpBadge op={p.op} /><ManageBadge managed /><span className="badge badge-warning">1 thay đổi đang chờ duyệt</span></div>
          </section>

          <section className="stack">
            <div className="row between" style={{ flexWrap: 'wrap' }}>
              <h2>Tổng quan</h2>
              <div className="seg" role="group" aria-label="Khoảng ngày">
                {[['1', 'Hôm nay'], ['7', '7 ngày'], ['30', '30 ngày']].map(([k, l]) => <button key={k} aria-pressed={range === k} onClick={() => setRange(k)}>{l}</button>)}
              </div>
            </div>
            <div className="stat-grid">
              <div className="stat"><Eye size={18} className="muted" /><div className="n">{s.views}</div><div className="l">Lượt xem trang chi tiết</div></div>
              <div className="stat"><Phone size={18} className="muted" /><div className="n">{s.calls}</div><div className="l">Nhấn Gọi</div></div>
              <div className="stat"><Navigation size={18} className="muted" /><div className="n">{s.directions}</div><div className="l">Nhấn Chỉ đường</div></div>
              <div className="stat"><ExternalLink size={18} className="muted" /><div className="n">{s.links}</div><div className="l">Nhấn liên kết ngoài</div></div>
            </div>
            <div className="card stack-sm">
              <div className="row between"><b>Lượt xem theo ngày</b><DemoBadge>số liệu demo</DemoBadge></div>
              <div className="bars" style={{ marginBottom: 22 }}>{s.daily.map((v, i) => <div key={i} style={{ height: `${(v / max) * 100}%` }} title={`${s.days[i]}: ${v}`}><span>{s.days[i]}</span></div>)}</div>
              <p className="xs muted"><Clock size={12} /> Cập nhật {s.updated} · Múi giờ Việt Nam. Nhấn Gọi không đồng nghĩa có cuộc gọi thành công; nhấn Chỉ đường không đồng nghĩa người xem đã đến quán. Lượt mở lặp trong 30 phút (đề xuất) được gộp; bạn không sửa được thống kê.</p>
            </div>
          </section>

          <section className="stack-sm">
            <h2>Việc cần xử lý</h2>
            <div className="queue-item" style={{ cursor: 'default' }}><div className="grow"><b>Chỉnh sửa giờ mở cửa & khoảng giá</b><div className="small muted">Gửi 01/11/2026 · bản công khai cũ vẫn hiển thị</div></div><StatusBadge status="pending" /></div>
            <div className="queue-item" style={{ cursor: 'default' }}><div className="grow"><b>Ảnh bìa mới</b><div className="small muted">Bị từ chối · Lý do (mẫu): ảnh mờ, vui lòng gửi ảnh rõ hơn</div></div><StatusBadge status="rejected" /></div>
          </section>

          <section className="stack-sm">
            <div className="row between"><h2>Đánh giá</h2><span className="small muted">Không sửa được sao hoặc nội dung khách</span></div>
            {reviews.length ? reviews.slice(0, 2).map((r) => (
              <div key={r.id} className="card stack-sm">
                <div className="row between"><b>{r.user}</b><span className="rating">★ {r.stars}</span></div>
                <p className="text-2 small">{r.text}</p>
                {r.reply ? <div className="reply">{r.reply}</div> : null}
                <div className="row-wrap"><Button size="sm" variant="outline" icon={MessageSquareReply}>{r.reply ? 'Sửa phản hồi' : 'Phản hồi'}</Button><Button size="sm" variant="ghost" icon={Flag}>Báo cáo vi phạm</Button></div>
                <p className="xs muted">Phản hồi của quản lý đi qua hàng chờ Admin.</p>
              </div>)) : <div className="card-flat small text-2">Chưa có đánh giá.</div>}
          </section>

          <section className="card stack-sm">
            <h3>Quyền quản lý</h3>
            <p className="small text-2">Trạng thái: <b>Đã xác minh quản lý</b>. Bạn không tự chuyển quyền cho người khác; cần hỗ trợ hãy gửi yêu cầu.</p>
            <Button variant="outline" size="sm">Gửi yêu cầu hỗ trợ</Button>
          </section>
        </div>
      </MgmtShell>
    </Gate>
  );
}

/* ===================== Chỉnh sửa thông tin & ảnh ===================== */
export function OwnerEdit() {
  const { id } = useParams();
  const { role, toast } = useApp();
  const p = byId(id) || byId('p1');
  const [tab, setTab] = useState('info');
  const [f, setF] = useState({ name: p.name, desc: p.desc, address: p.address, phone: p.phone || '', hours: p.hours || '', price: p.price || '' });
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const submit = () => { setBusy(true); setTimeout(() => { setBusy(false); setSent(true); toast('Đã gửi thay đổi (mô phỏng) — chờ Admin duyệt'); }, 800); };
  const dirty = f.name !== p.name || f.desc !== p.desc || f.address !== p.address || f.phone !== (p.phone || '') || f.hours !== (p.hours || '') || f.price !== (p.price || '');
  const off = Array.from({ length: p.photos.official }, (_, i) => i);
  const com = Array.from({ length: p.photos.community }, (_, i) => i);
  return (
    <Gate role={role} need="owner">
      <MgmtShell kind="owner">
        <div className="stack-lg form-narrow" style={{ margin: 0, maxWidth: 760 }}>
          <div><h1>Chỉnh sửa: {p.name}</h1><p className="small text-2">Thay đổi công khai phải qua Admin. Bản công khai hiện hành được giữ trong lúc chờ.</p></div>
          <Tabs value={tab} onChange={setTab} label="Nội dung chỉnh sửa" tabs={[{ id: 'info', label: 'Thông tin' }, { id: 'photos', label: 'Ảnh' }, { id: 'menu', label: 'Menu' }]} />
          {sent && <Banner type="success" title="Đã gửi đề xuất thay đổi.">Trạng thái: chờ duyệt. Bạn theo dõi trong mục “Việc cần xử lý”.</Banner>}
          {tab === 'info' && (
            <div className="stack">
              <Field label="Tên địa điểm" htmlFor="o-n"><input id="o-n" className="input" value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setSent(false); }} /></Field>
              <Field label="Mô tả" htmlFor="o-d"><textarea id="o-d" className="textarea" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></Field>
              <Field label="Địa chỉ" htmlFor="o-a"><input id="o-a" className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
              <Field label="Số điện thoại công khai" htmlFor="o-p" hint="Lưu riêng với SĐT đăng nhập. Để trống nếu không muốn hiện nút Gọi."><input id="o-p" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              <Field label="Giờ mở cửa" htmlFor="o-h" hint="Chỉ nhập khi chắc chắn; nếu để trống sẽ hiển thị “Chưa có thông tin”."><input id="o-h" className="input" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field>
              <Field label="Khoảng giá (tham khảo)" htmlFor="o-pr"><input id="o-pr" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
              <Field label="Trạng thái hoạt động" htmlFor="o-op" hint="Tách riêng khỏi trạng thái kiểm duyệt."><select id="o-op" className="select" defaultValue={p.op}><option value="active">Đang hoạt động</option><option value="temp-closed">Tạm đóng</option><option value="closed">Ngừng hoạt động</option></select></Field>
              <div className="decision-bar"><Button variant="outline" onClick={() => setF({ name: p.name, desc: p.desc, address: p.address, phone: p.phone || '', hours: p.hours || '', price: p.price || '' })} disabled={!dirty}>Hoàn tác</Button><Button loading={busy} disabled={!dirty} onClick={submit}>Gửi để duyệt</Button></div>
            </div>
          )}
          {tab === 'photos' && (
            <div className="stack-lg">
              <section className="stack-sm"><h2>Ảnh chính thức</h2><p className="small text-2">Bạn được thay ảnh đại diện, ảnh bìa và ảnh chính thức. Ảnh mới vẫn qua Admin; ảnh đang công khai được giữ lại.</p>
                <div className="thumb-grid">{off.map((i) => <div key={i} style={{ aspectRatio: 1, borderRadius: 8, overflow: 'hidden' }}><PlaceArt kind={p.art.kind} seed={p.art.seed + i * 3} label={false} /></div>)}
                  <button className="dropzone" style={{ aspectRatio: 1, padding: 4 }} onClick={() => toast('Chọn ảnh từ thiết bị (mô phỏng)', 'info')}><Upload size={20} /><div className="xs">Thêm ảnh</div></button></div>
                <div className="row-wrap"><Button size="sm" variant="outline" icon={Camera}>Đổi ảnh bìa</Button><Button size="sm" variant="outline" icon={Camera}>Đổi ảnh đại diện</Button></div>
              </section>
              <section className="stack-sm"><h2>Ảnh cộng đồng <span className="badge badge-neutral"><Lock size={11} /> Chỉ xem</span></h2>
                <Banner type="info">Ảnh do cộng đồng gửi được giữ riêng. Chủ địa điểm không sửa hoặc xóa; nếu thấy vi phạm, hãy báo cáo để Admin xem xét.</Banner>
                <div className="thumb-grid">{com.length ? com.map((i) => <div key={i} style={{ aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' }}><PlaceArt kind={p.art.kind} seed={p.art.seed + i * 3 + 1} label={false} /><button className="pc-fav" aria-label="Báo cáo ảnh này" style={{ width: 28, height: 28 }}><Flag size={13} /></button></div>) : <p className="small muted">Chưa có ảnh cộng đồng.</p>}</div>
              </section>
            </div>
          )}
          {tab === 'menu' && (
            <div className="stack">
              <p className="small text-2">Tải ảnh thực đơn hoặc bảng giá kèm ngày cập nhật. Không có giỏ hàng hay đặt món trong 11Local.</p>
              <div className="dropzone"><Upload size={22} /><div>Tải ảnh thực đơn (mô phỏng)</div></div>
              <Field label="Ngày cập nhật bảng giá" htmlFor="o-md"><input id="o-md" type="date" className="input" defaultValue="2026-11-01" /></Field>
              <Button onClick={() => toast('Đã gửi thực đơn (mô phỏng) — chờ duyệt')}>Gửi để duyệt</Button>
            </div>
          )}
        </div>
      </MgmtShell>
    </Gate>
  );
}
