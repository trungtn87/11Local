import { Fragment, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Clock, Flag, BadgeCheck, EyeOff, Eye, Check, X, MessageCircleQuestion, Search, AlertTriangle, History, Users, GitMerge, ChevronRight, RefreshCw } from 'lucide-react';
import { useApp } from '../store.jsx';
import { byId, places, catLabel, kindLabel } from '../data/demo.js';
import { MgmtShell } from '../components/layout.jsx';
import { Gate } from './Owner.jsx';
import { Button, Banner, Field, StateBlock, StatusBadge, OpBadge, ManageBadge, PlaceArt, Sheet, DemoBadge, Tabs } from '../components/ui.jsx';

const Wrap = ({ children }) => { const { role } = useApp(); return <Gate role={role} need="admin"><MgmtShell kind="admin">{children}</MgmtShell></Gate>; };

/* ===================== Dashboard quản trị ===================== */
export function AdminHome() {
  const { queue, claims } = useApp();
  const pend = queue.filter((q) => ['pending', 'needs-info'].includes(q.status));
  const by = (k) => pend.filter((q) => q.kind === k).length;
  const aged = pend.filter((q) => /tồn lâu/.test(q.age));
  return (
    <Wrap>
      <div className="stack-lg">
        <div><h1>Tổng quan quản trị</h1><p className="small muted">Số liệu demo trên dữ liệu mẫu hư cấu.</p></div>
        <div className="stat-grid">
          <Link to="/admin/hang-cho" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}><div className="n">{pend.length}</div><div className="l">Hồ sơ chờ xử lý</div></Link>
          <Link to="/admin/hang-cho" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}><div className="n" style={{ color: 'var(--c-danger)' }}>{aged.length}</div><div className="l">Tồn lâu (&gt; 7 ngày)</div></Link>
          <Link to="/admin/xac-minh" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}><div className="n">{claims.filter((c) => c.status !== 'done').length}</div><div className="l">Yêu cầu quản lý</div></Link>
          <div className="stat"><div className="n">{by('report-error')}</div><div className="l">Báo sai cần xem</div></div>
        </div>
        <section className="card stack-sm">
          <h3>Chờ xử lý theo loại</h3>
          {['new-place', 'edit-place', 'report-error', 'photo'].map((k) => <div key={k} className="row between"><span>{kindLabel[k]}</span><b>{by(k)}</b></div>)}
        </section>
        <section className="stack-sm">
          <div className="row between"><h3>Cần xem trước</h3><Link to="/admin/hang-cho" className="small">Vào hàng chờ</Link></div>
          {pend.slice(0, 3).map((q) => <QueueRow key={q.id} q={q} />)}
        </section>
        <section className="card stack-sm"><h3>Phân hệ khác</h3><p className="small text-2">Ảnh & menu · Đánh giá & phản hồi · Tranh chấp · Người dùng · Danh mục & khu vực · Nhật ký — <b>placeholder</b>, chưa dựng ở V1 UI.</p></section>
      </div>
    </Wrap>
  );
}

function QueueRow({ q }) {
  return (
    <Link to={`/admin/ho-so/${q.id}`} className="queue-item">
      <div className="grow stack-sm" style={{ gap: 2 }}>
        <div className="row-wrap"><span className="badge badge-info">{kindLabel[q.kind]}</span>{q.sub === 'guest' && <span className="badge badge-neutral">Khách</span>}{q.baseStale && <span className="badge badge-warning">Bản gốc đã đổi</span>}</div>
        <b>{q.title}</b><span className="small muted">{q.area} · {q.submitter} · {q.at}</span>
      </div>
      <div className="stack-sm" style={{ alignItems: 'flex-end' }}><StatusBadge status={q.status} /><span className={`xs ${/tồn lâu/.test(q.age) ? '' : 'muted'}`} style={/tồn lâu/.test(q.age) ? { color: 'var(--c-danger)', fontWeight: 600 } : undefined}>{q.age}</span></div>
      <ChevronRight size={18} className="muted" />
    </Link>
  );
}

/* ===================== Hàng chờ kiểm duyệt ===================== */
export function AdminQueue() {
  const { queue, forced, setForced } = useApp();
  const [kind, setKind] = useState('all'); const [status, setStatus] = useState('open'); const [sort, setSort] = useState('new');
  let list = queue.filter((q) => (kind === 'all' || q.kind === kind) && (status === 'all' || (status === 'open' ? ['pending', 'needs-info'].includes(q.status) : q.status === status)));
  if (sort === 'old') list = [...list].reverse();
  return (
    <Wrap>
      <div className="stack-lg">
        <h1>Hàng chờ kiểm duyệt</h1>
        <div className="row-wrap">
          <select className="select" style={{ width: 'auto' }} aria-label="Loại hồ sơ" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">Mọi loại</option>{Object.entries(kindLabel).slice(0, 4).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select className="select" style={{ width: 'auto' }} aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Đang mở</option><option value="pending">Chờ duyệt</option><option value="needs-info">Cần bổ sung</option><option value="approved">Đã duyệt</option><option value="rejected">Từ chối</option><option value="all">Tất cả</option></select>
          <select className="select" style={{ width: 'auto' }} aria-label="Sắp xếp theo thời gian gửi" value={sort} onChange={(e) => setSort(e.target.value)}><option value="new">Mới gửi trước</option><option value="old">Cũ gửi trước</option></select>
        </div>
        {forced === 'error' ? <StateBlock kind="error" title="Không tải được hàng chờ" actions={<Button icon={RefreshCw} onClick={() => setForced('none')}>Thử lại</Button>}>Dữ liệu chưa được thay đổi.</StateBlock>
          : list.length ? <div className="stack-sm">{list.map((q) => <QueueRow key={q.id} q={q} />)}</div>
          : <StateBlock kind="empty" title="Hàng chờ trống">Không có hồ sơ phù hợp bộ lọc. Làm tốt lắm!</StateBlock>}
      </div>
    </Wrap>
  );
}

/* ===================== Chi tiết hồ sơ + duyệt / từ chối / yêu cầu bổ sung ===================== */
export function AdminReview() {
  const { id } = useParams();
  const { queue, setQueue, toast } = useApp();
  const nav = useNavigate();
  const q = queue.find((x) => x.id === id);
  const [act, setAct] = useState(null); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [loadedVer, setLoadedVer] = useState(q?.version); const [conflict, setConflict] = useState(false);
  if (!q) return <Wrap><StateBlock kind="empty" title="Không tìm thấy hồ sơ" actions={<Button onClick={() => nav('/admin/hang-cho')}>Về hàng chờ</Button>} /></Wrap>;
  const place = q.placeId ? byId(q.placeId) : null;
  const closed = !['pending', 'needs-info'].includes(q.status);
  const labels = { approve: ['Duyệt hồ sơ', 'Căn cứ phê duyệt', 'Ghi căn cứ (bắt buộc) — lưu vào nhật ký, không sửa lại được.'], info: ['Yêu cầu bổ sung', 'Nội dung gửi cho người đóng góp', 'Người đóng góp xem được nội dung này qua mã tra cứu. Không ghi dữ liệu của người khác.'], reject: ['Từ chối hồ sơ', 'Lý do từ chối', 'Lý do bắt buộc và được lưu vào nhật ký.'] };
  const confirm = () => {
    if (!text.trim()) { setErr('Trường này bắt buộc.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (conflict || loadedVer !== q.version) { setAct(null); toast('Hồ sơ đã được người khác xử lý — không ghi đè. Hãy tải lại.', 'error'); return; }
      const st = act === 'approve' ? 'approved' : act === 'reject' ? 'rejected' : 'needs-info';
      setQueue((l) => l.map((x) => (x.id === q.id ? { ...x, status: st, version: x.version + 1 } : x)));
      setLoadedVer(q.version + 1); setAct(null); setText('');
      toast(act === 'approve' ? 'Đã duyệt (mô phỏng). Hồ sơ không được xuất bản hai lần.' : act === 'reject' ? 'Đã từ chối (mô phỏng)' : 'Đã yêu cầu bổ sung (mô phỏng)', 'success');
    }, 700);
  };
  const simulateConflict = () => { setConflict(true); toast('Mô phỏng: một Admin khác vừa xử lý hồ sơ này', 'info'); };
  const reload = () => { setConflict(false); setLoadedVer(q.version); toast('Đã tải lại dữ liệu mới nhất', 'info'); };

  return (
    <Wrap>
      <div className="stack-lg">
        <div className="stack-sm">
          <Link to="/admin/hang-cho" className="small">← Hàng chờ</Link>
          <div className="row-wrap"><span className="badge badge-info">{kindLabel[q.kind]}</span><StatusBadge status={q.status} /><span className="version-chip" title="Mã phiên bản dùng để phát hiện xung đột (mô phỏng)">v{q.version}</span></div>
          <h1>{q.title}</h1>
          <p className="small muted">{q.submitter} · gửi {q.at} · {q.area}</p>
        </div>

        {conflict && <Banner type="danger" title="Phiên bản đã thay đổi.">Một Admin khác đã xử lý hồ sơ này sau khi bạn mở. Quyết định của bạn <b>không được áp dụng</b> để tránh ghi đè. <button className="btn btn-sm btn-outline" onClick={reload}>Tải lại</button></Banner>}
        {q.baseStale && <Banner type="warning" title="Đề xuất dựa trên bản công khai cũ.">Bản công khai hiện hành đã khác lúc đề xuất. Hãy đối chiếu lại trước khi duyệt.</Banner>}
        {closed && <Banner type="success">Hồ sơ đã xử lý: <b>{{ approved: 'Đã duyệt', rejected: 'Từ chối' }[q.status]}</b>. Không thể xử lý lại (gửi lại cùng quyết định không tạo hai lần xuất bản).</Banner>}

        <div className="review-layout">
          <div className="stack-lg">
            {q.diff ? (
              <section className="stack-sm"><h2>Phần khác nhau</h2><div className="diff">{q.diff.map((d) => <div key={d.k} className="diff-row"><div className="k">{d.k}</div><div className="old">{d.old}</div><div className="new">{d.now}</div></div>)}</div></section>
            ) : (
              <section className="card stack-sm"><h2>Dữ liệu đề xuất</h2><dl className="kv">{Object.entries(q.data || {}).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl></section>
            )}
            {place && <section className="card stack-sm"><h3>Dữ liệu công khai hiện hành</h3><div className="row"><div style={{ width: 80, height: 60, borderRadius: 8, overflow: 'hidden', flex: 'none' }}><PlaceArt kind={place.art.kind} seed={place.art.seed} label={false} /></div><div><Link to={`/dia-diem/${place.id}`}><b>{place.name}</b></Link><div className="small muted">{place.address}, {place.area}</div><div className="row-wrap" style={{ marginTop: 4 }}><OpBadge op={place.op} /><ManageBadge managed={place.managed} /></div></div></div></section>}
            {q.photos > 0 && <section className="stack-sm"><h3>Ảnh ({q.photos}) — chờ duyệt, chưa công khai</h3><div className="thumb-grid">{Array.from({ length: q.photos }, (_, i) => <div key={i} style={{ aspectRatio: 1, borderRadius: 8, overflow: 'hidden' }}><PlaceArt kind="sight" seed={q.id.length + i * 4} label={false} /></div>)}</div></section>}
            <section className="stack-sm"><h3><GitMerge size={16} style={{ verticalAlign: -2 }} /> Khả năng trùng</h3>
              {q.dupes.length ? q.dupes.map((d) => <div key={d.id} className="card-flat"><div className="row between"><div><b>{d.name}</b><div className="small text-2">{d.why}</div></div><Link to={`/dia-diem/${d.id}`} className="btn btn-outline btn-sm">So sánh</Link></div><p className="xs muted" style={{ marginTop: 6 }}>Hệ thống chỉ gợi ý. Admin tự chọn hồ sơ giữ lại; không tự cộng sao hay xóa lịch sử. (Chức năng hợp nhất: placeholder.)</p></div>) : <p className="small muted">Không phát hiện hồ sơ tương tự.</p>}
            </section>
          </div>
          <aside className="stack">
            <section className="card stack-sm"><h3><History size={16} style={{ verticalAlign: -2 }} /> Lịch sử</h3>
              <ol className="timeline"><li className="done"><b>Đã gửi</b><div className="muted">{q.at}</div></li>{q.status !== 'pending' && <li className="done"><b>{q.status === 'needs-info' ? 'Yêu cầu bổ sung' : q.status === 'approved' ? 'Duyệt (căn cứ đã ghi)' : 'Từ chối (lý do đã ghi)'}</b><div className="muted">Admin Demo · v{q.version}</div></li>}{!closed && <li className="current"><b>Chờ quyết định</b></li>}</ol>
            </section>
            <section className="card stack-sm"><h3>Nguồn gửi</h3><p className="small text-2">{q.submitter}. Liên hệ (nếu có) được lưu riêng, không công khai.</p></section>
            {!closed && <button className="btn btn-ghost btn-sm" onClick={simulateConflict}><AlertTriangle size={14} /> Mô phỏng: Admin khác xử lý trước</button>}
          </aside>
        </div>

        {!closed && (
          <div className="decision-bar" role="group" aria-label="Quyết định">
            <Button variant="primary" icon={Check} onClick={() => { setText(''); setErr(''); setAct('approve'); }}>Duyệt</Button>
            <Button variant="outline" icon={MessageCircleQuestion} onClick={() => { setText(''); setErr(''); setAct('info'); }}>Yêu cầu bổ sung</Button>
            <Button variant="danger-outline" icon={X} onClick={() => { setText(''); setErr(''); setAct('reject'); }}>Từ chối</Button>
          </div>
        )}
      </div>

      <Sheet open={!!act} onClose={() => setAct(null)} title={act && labels[act][0]}>
        {act && <div className="stack">
          <Field label={labels[act][1]} required htmlFor="dec" hint={labels[act][2]} error={err}><textarea id="dec" className="textarea" value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} autoFocus /></Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="outline" onClick={() => setAct(null)}>Hủy</Button><Button variant={act === 'reject' ? 'danger' : 'primary'} loading={busy} onClick={confirm}>{act === 'approve' ? 'Xác nhận duyệt' : act === 'reject' ? 'Xác nhận từ chối' : 'Gửi yêu cầu'}</Button></div>
        </div>}
      </Sheet>
    </Wrap>
  );
}

/* ===================== Danh sách địa điểm (Admin) ===================== */
export function AdminPlaces() {
  const { hiddenIds, setHiddenIds, toast } = useApp();
  const [q, setQ] = useState(''); const [target, setTarget] = useState(null); const [reason, setReason] = useState(''); const [err, setErr] = useState('');
  const list = places.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const doToggle = () => {
    if (!reason.trim()) { setErr('Cần ghi lý do.'); return; }
    const hidden = hiddenIds.includes(target.id);
    setHiddenIds((h) => (hidden ? h.filter((x) => x !== target.id) : [...h, target.id]));
    toast(hidden ? `Đã hiện lại “${target.name}” (mô phỏng) — hành động Admin riêng, có nhật ký` : `Đã ẩn “${target.name}” — mở trang khách để thấy địa điểm biến mất`, 'success');
    setTarget(null); setReason('');
  };
  return (
    <Wrap>
      <div className="stack-lg">
        <div className="row between" style={{ flexWrap: 'wrap' }}><h1>Địa điểm</h1><div className="searchbar compact" style={{ minWidth: 240 }}><Search size={16} /><input aria-label="Tìm trong danh sách" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên địa điểm…" /></div></div>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Địa điểm</th><th>Danh mục</th><th>Kiểm duyệt</th><th>Hoạt động</th><th>Quản lý</th><th aria-label="Thao tác" /></tr></thead>
          <tbody>{list.map((p) => { const hid = hiddenIds.includes(p.id); return (
            <tr key={p.id}>
              <td><Link to={`/dia-diem/${p.id}`}><b>{p.name}</b></Link><div className="xs muted">{p.area} · cập nhật {p.updated}</div></td>
              <td>{catLabel(p.cat)}</td>
              <td><StatusBadge status={hid ? 'hidden' : 'approved'} /></td>
              <td><OpBadge op={p.op} /></td>
              <td>{p.managed ? <span className="badge badge-verified">Đã xác minh</span> : <span className="badge badge-neutral">Chưa</span>}</td>
              <td><Button size="sm" variant="outline" icon={hid ? Eye : EyeOff} onClick={() => { setTarget(p); setReason(''); setErr(''); }}>{hid ? 'Hiện lại' : 'Ẩn'}</Button></td>
            </tr>); })}</tbody>
        </table></div>
        {!list.length && <StateBlock kind="empty" title="Không có địa điểm phù hợp" />}
        <p className="xs muted">Ba trạng thái độc lập: Kiểm duyệt · Hoạt động · Quyền quản lý. Ẩn/hiện chỉ đổi hiển thị công khai, là hành động Admin riêng và cần lý do.</p>
      </div>
      <Sheet open={!!target} onClose={() => setTarget(null)} title={target && (hiddenIds.includes(target.id) ? 'Hiện lại địa điểm' : 'Ẩn địa điểm')}>
        {target && <div className="stack">
          <Banner type="warning">{hiddenIds.includes(target.id) ? 'Địa điểm sẽ hiển thị lại trên mọi màn hình công khai.' : 'Địa điểm bị ẩn sẽ không còn hiển thị ở danh sách, bản đồ, tìm kiếm và đường dẫn trực tiếp.'}</Banner>
          <Field label="Lý do" required htmlFor="hr" error={err}><textarea id="hr" className="textarea" value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} /></Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="outline" onClick={() => setTarget(null)}>Hủy</Button><Button onClick={doToggle}>Xác nhận</Button></div>
        </div>}
      </Sheet>
    </Wrap>
  );
}

/* ===================== Xác minh chủ địa điểm ===================== */
export function AdminClaims() {
  const { claims, setClaims, toast } = useApp();
  const [sel, setSel] = useState(claims[0]?.id);
  const [checks, setChecks] = useState({});
  const [basis, setBasis] = useState('');
  const c = claims.find((x) => x.id === sel);
  const conds = [['placeApproved', 'Địa điểm đã được Admin duyệt'], ['phoneVerified', 'Tài khoản đã xác minh SĐT'], ['basis', 'Có căn cứ về quyền đại diện'], ['noDispute', 'Không còn tranh chấp ngăn việc cấp quyền'], ['reason', 'Admin phê duyệt và lưu lý do']];
  const k = checks[sel] || {};
  const all = conds.every(([key]) => k[key]);
  const decide = (st, msg) => { setClaims((l) => l.map((x) => (x.id === sel ? { ...x, status: st } : x))); toast(msg, 'success'); setBasis(''); };
  return (
    <Wrap>
      <div className="stack-lg">
        <h1>Xác minh quản lý địa điểm</h1>
        <Banner type="info">OTP chỉ chứng minh người dùng kiểm soát số điện thoại — <b>không tự cấp quyền</b>. Admin quyết định thủ công và ghi căn cứ.</Banner>
        <div className="review-layout">
          <div className="stack-sm">
            {claims.map((x) => <button key={x.id} className="queue-item" style={{ textAlign: 'left', width: '100%', borderColor: sel === x.id ? 'var(--c-indigo-700)' : undefined, borderWidth: sel === x.id ? 2 : 1 }} onClick={() => setSel(x.id)}>
              <div className="grow"><b>{x.place}</b><div className="small muted">{x.who} · {x.role} · {x.at}</div></div><StatusBadge status={x.status} /></button>)}
          </div>
          {c && <aside className="card stack" aria-live="polite">
            <div className="row between"><h2>{c.place}</h2><StatusBadge status={c.status} /></div>
            <dl className="kv"><dt>Người yêu cầu</dt><dd>{c.who}</dd><dt>Vai trò tự khai</dt><dd>{c.role}</dd><dt>SĐT so với quán</dt><dd>{c.phoneMatch ? <span className="badge badge-success">Trùng SĐT quán</span> : <span className="badge badge-warning">Khác / thiếu</span>}</dd><dt>Bằng chứng</dt><dd>{c.evidence.length ? c.evidence.join(', ') : 'Chưa có'}</dd></dl>
            <Banner type={c.status === 'dispute' ? 'danger' : 'info'}>{c.note}</Banner>
            {c.status === 'dispute' ? <p className="small text-2">Không tự thu hồi hoặc chuyển quyền người hiện tại. Admin có thể tạm hạn chế thay đổi nếu có căn cứ và ghi rõ lý do. <i>(Màn xử lý tranh chấp: placeholder.)</i></p> : (
              <>
                <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}><legend className="label" style={{ marginBottom: 6 }}>5 điều kiện để gắn nhãn “Đã xác minh quản lý”</legend>
                  {conds.map(([key, l]) => <label className="check" key={key}><input type="checkbox" checked={!!k[key]} onChange={(e) => setChecks({ ...checks, [sel]: { ...k, [key]: e.target.checked } })} />{l}</label>)}
                </fieldset>
                <Field label="Căn cứ phê duyệt" required htmlFor="cb" hint="Lưu vào nhật ký bất biến."><textarea id="cb" className="textarea" value={basis} onChange={(e) => setBasis(e.target.value)} /></Field>
                <div className="row-wrap">
                  <Button icon={BadgeCheck} disabled={!all || !basis.trim() || c.status === 'done'} onClick={() => decide('approved', 'Đã cấp quyền quản lý (mô phỏng)')}>Duyệt cấp quyền</Button>
                  <Button variant="outline" onClick={() => decide('verifying', 'Đã yêu cầu bổ sung bằng chứng (mô phỏng)')}>Yêu cầu bổ sung</Button>
                  <Button variant="danger-outline" disabled={!basis.trim()} onClick={() => decide('rejected', 'Đã từ chối yêu cầu (mô phỏng)')}>Từ chối</Button>
                </div>
                {!all && <p className="xs muted">Cần đủ 5 điều kiện và căn cứ mới được duyệt.</p>}
              </>)}
          </aside>}
        </div>
      </div>
    </Wrap>
  );
}
