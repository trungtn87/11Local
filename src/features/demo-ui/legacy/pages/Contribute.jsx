import { useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, Camera, Search as SearchIcon, ArrowLeft, Upload, X, TriangleAlert } from 'lucide-react';
import { useApp, demoCode } from '../store.jsx';
import { areas, places, byId, fold, catLabel } from '../data/demo.js';
import { Button, Field, Banner, StatusBadge, Steps, PlaceArt, StateBlock, PlaceCard } from '../components/ui.jsx';
import { PinPicker } from '../components/MapView.jsx';

/* ===================== Đóng góp địa điểm mới (4 bước) ===================== */
export function Contribute() {
  const { addContrib, toast, role, categories } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ name: '', cat: '', area: '', address: '', hint: '', desc: '', phone: '', contact: '' });
  const [pin, setPin] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [agree, setAgree] = useState(false);
  const similar = useMemo(() => (q.trim().length > 1 ? places.filter((p) => fold(p.name).includes(fold(q)) || fold(q).includes(fold(p.name.split(' ')[0]))).slice(0, 3) : []), [q]);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const validate2 = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Nhập tên địa điểm.';
    else if (/giảm giá|khuyến mãi|sale|\d{2,}%/i.test(f.name)) e.name = 'Tên không nên chứa nội dung quảng cáo.';
    if (!f.cat) e.cat = 'Chọn một danh mục.';
    if (!f.area) e.area = 'Chọn khu vực.';
    if (!f.address.trim()) e.address = 'Nhập địa chỉ đủ để tìm được địa điểm.';
    setErrors(e); return !Object.keys(e).length;
  };
  const validate3 = () => { if (!pin) { setErrors({ pin: 'Hãy đặt ghim vị trí trên bản đồ và kiểm tra lại trước khi gửi.' }); return false; } return true; };
  const next = () => { if (step === 2 && !validate2()) return; if (step === 3 && !validate3()) return; setStep((s) => s + 1); window.scrollTo(0, 0); };

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      const code = demoCode();
      addContrib({ code, title: f.name, kind: 'Địa điểm mới', status: 'pending', at: '02/11/2026' });
      setDone(code); setBusy(false);
    }, 900);
  };

  if (done) return (
    <div className="container page form-narrow stack-lg">
      <div className="center stack">
        <div className="state" style={{ padding: 0 }}><div className="ico" style={{ background: 'var(--c-success-bg)', color: 'var(--c-success)' }}><CheckCircle2 size={34} /></div></div>
        <h1>Đã gửi đóng góp</h1>
        <div><StatusBadge status="pending" /></div>
        <p className="text-2">“{f.name}” đang <b>chờ Admin duyệt</b> và chưa hiển thị công khai.</p>
      </div>
      <div className="card center stack-sm" style={{ borderColor: 'var(--c-accent-500)', borderWidth: 2 }}>
        <span className="small muted">Mã tra cứu của bạn (MÃ DEMO)</span>
        <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 26, fontWeight: 800, letterSpacing: '.04em', userSelect: 'all', wordBreak: 'break-all' }}>{done}</div>
        <Button variant="outline" icon={Copy} onClick={() => { navigator.clipboard?.writeText(done).catch(() => {}); toast('Đã sao chép mã tra cứu'); }}>Sao chép mã</Button>
        <p className="xs muted">Hãy lưu mã này: đây là cách duy nhất để theo dõi khi bạn chưa có tài khoản. Không chia sẻ công khai. (Mã thật sẽ do máy chủ sinh, khó đoán — chưa có ở bản xem trước.)</p>
      </div>
      <div className="row-wrap" style={{ justifyContent: 'center' }}>
        <Button onClick={() => nav(`/theo-doi?ma=${done}`)}>Theo dõi trạng thái</Button>
        <Button variant="outline" onClick={() => nav('/')}>Về trang chủ</Button>
      </div>
    </div>
  );

  return (
    <div className="container page form-narrow stack-lg">
      <div className="stack-sm">
        <div className="row between"><h1>Đóng góp địa điểm</h1><span className="small muted">Bước {step}/4</span></div>
        <Steps total={4} current={step} />
        {role === 'guest' && <p className="small text-2">Bạn không cần tài khoản. Sau khi gửi bạn nhận mã tra cứu để theo dõi.</p>}
      </div>

      {step === 1 && (
        <section className="stack" aria-label="Tìm trước">
          <h2>Địa điểm này đã có chưa?</h2>
          <div className="searchbar"><SearchIcon size={18} /><input aria-label="Tên địa điểm" value={q} onChange={(e) => { setQ(e.target.value); set('name', e.target.value); }} placeholder="Nhập tên địa điểm…" /></div>
          {similar.length > 0 && (<>
            <Banner type="warning" title="Có hồ sơ tương tự.">Bạn có thể đóng góp cho hồ sơ cũ (báo sai, thêm ảnh) hoặc tiếp tục gửi hồ sơ mới kèm giải thích.</Banner>
            <div className="stack-sm">{similar.map((p) => <PlaceCard key={p.id} place={p} horizontal />)}</div>
            <Field label="Vì sao đây là địa điểm khác?" htmlFor="why" hint="Chỉ cần nếu bạn vẫn gửi hồ sơ mới."><input id="why" className="input" placeholder="Ví dụ: cùng tên nhưng ở khu vực khác" /></Field>
          </>)}
          {q.trim().length > 1 && similar.length === 0 && <Banner type="success">Chưa thấy hồ sơ trùng. Bạn có thể tiếp tục.</Banner>}
          <Button size="lg" block onClick={next}>Tiếp tục gửi địa điểm mới</Button>
        </section>
      )}

      {step === 2 && (
        <section className="stack" aria-label="Thông tin">
          <h2>Thông tin địa điểm</h2>
          <Field label="Tên địa điểm" required htmlFor="c-name" error={errors.name} hint="Tên dễ nhận biết, không dùng nội dung quảng cáo thay tên."><input id="c-name" className={`input ${errors.name ? 'invalid' : ''}`} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Danh mục" required htmlFor="c-cat" error={errors.cat}>
            <select id="c-cat" className={`select ${errors.cat ? 'invalid' : ''}`} value={f.cat} onChange={(e) => set('cat', e.target.value)}><option value="">Chọn danh mục…</option>{categories.filter((c) => c.enabled).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </Field>
          <Field label="Khu vực" required htmlFor="c-area" error={errors.area}>
            <select id="c-area" className={`select ${errors.area ? 'invalid' : ''}`} value={f.area} onChange={(e) => set('area', e.target.value)}><option value="">Chọn khu vực…</option>{areas.map((a) => <option key={a}>{a}</option>)}</select>
          </Field>
          <Field label="Địa chỉ" required htmlFor="c-addr" error={errors.address}><input id="c-addr" className={`input ${errors.address ? 'invalid' : ''}`} value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Hướng dẫn vị trí" htmlFor="c-hint" hint="Ví dụ: đối diện chợ, rẽ trái sau cầu."><input id="c-hint" className="input" value={f.hint} onChange={(e) => set('hint', e.target.value)} /></Field>
          <Field label="Mô tả ngắn (tùy chọn)" htmlFor="c-desc"><textarea id="c-desc" className="textarea" value={f.desc} onChange={(e) => set('desc', e.target.value)} /></Field>
          <Field label="SĐT công khai của địa điểm (tùy chọn)" htmlFor="c-phone" hint="Khác SĐT đăng nhập; không dùng làm tài khoản."><input id="c-phone" inputMode="tel" className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Liên hệ của bạn (tùy chọn, không công khai)" htmlFor="c-ct" hint="Admin chỉ dùng khi cần hỏi thêm."><input id="c-ct" className="input" value={f.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
          <div className="row"><Button variant="outline" icon={ArrowLeft} onClick={() => setStep(1)}>Quay lại</Button><div className="grow"><Button block onClick={next}>Tiếp tục</Button></div></div>
        </section>
      )}

      {step === 3 && (
        <section className="stack" aria-label="Vị trí và ảnh">
          <h2>Ghim vị trí & ảnh</h2>
          <Field label="Ghim tọa độ" required error={errors.pin} hint="Chạm bản đồ để đặt ghim, rồi kiểm tra đúng chỗ trước khi gửi."><PinPicker value={pin} onChange={(v) => { setPin(v); setErrors({}); }} /></Field>
          <Field label="Ảnh (tùy chọn)" hint="JPEG, PNG, WebP — tối đa 10 MB/ảnh, 10 ảnh mỗi lần gửi (giới hạn đề xuất). Ảnh chỉ công khai sau khi Admin duyệt.">
            <div className="dropzone"><Upload size={24} /><div style={{ margin: '6px 0' }}>Chọn ảnh từ thiết bị</div>
              <Button variant="outline" size="sm" icon={Camera} onClick={() => photos.length < 10 && setPhotos((p) => [...p, { id: Date.now(), seed: p.length + 3 }])}>Thêm ảnh mẫu (mô phỏng)</Button></div>
          </Field>
          {photos.length > 0 && <div className="thumb-grid">{photos.map((p) => <div key={p.id} style={{ aspectRatio: 1, position: 'relative', borderRadius: 8, overflow: 'hidden' }}><PlaceArt kind="sight" seed={p.seed} label={false} /><button className="pc-fav" style={{ width: 28, height: 28 }} aria-label="Bỏ ảnh" onClick={() => setPhotos((l) => l.filter((x) => x.id !== p.id))}><X size={14} /></button></div>)}</div>}
          <div className="row"><Button variant="outline" icon={ArrowLeft} onClick={() => setStep(2)}>Quay lại</Button><div className="grow"><Button block onClick={next}>Xem lại</Button></div></div>
        </section>
      )}

      {step === 4 && (
        <section className="stack" aria-label="Xem lại và gửi">
          <h2>Xem lại trước khi gửi</h2>
          <dl className="card kv">
            <dt>Tên</dt><dd><b>{f.name}</b></dd><dt>Danh mục</dt><dd>{catLabel(f.cat)}</dd><dt>Khu vực</dt><dd>{f.area}</dd><dt>Địa chỉ</dt><dd>{f.address}</dd>
            <dt>Ghim</dt><dd>Đã đặt ghim</dd><dt>Ảnh</dt><dd>{photos.length} ảnh (chờ duyệt)</dd>
          </dl>
          <Banner type="info">Đóng góp sẽ ở trạng thái <b>Chờ duyệt</b>. Chỉ hồ sơ được Admin duyệt mới công khai. Thông tin liên hệ của bạn không công khai.</Banner>
          <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>Tôi xác nhận thông tin là đúng theo hiểu biết của tôi và tôi có quyền gửi ảnh này.</span></label>
          <div className="row"><Button variant="outline" icon={ArrowLeft} onClick={() => setStep(3)} disabled={busy}>Quay lại</Button><div className="grow"><Button block loading={busy} disabled={!agree} onClick={submit}>{busy ? 'Đang gửi…' : 'Gửi đóng góp'}</Button></div></div>
          <p className="xs muted center">Nút gửi bị khóa khi đang xử lý để tránh gửi lặp.</p>
        </section>
      )}
    </div>
  );
}

/* ===================== Báo sai / đề xuất sửa / gửi ảnh ===================== */
export function ReportError() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const p = byId(id);
  const { addContrib, toast } = useApp();
  const nav = useNavigate();
  const [type, setType] = useState(sp.get('loai') === 'anh' ? 'photo' : 'address');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [code, setCode] = useState(null); const [err, setErr] = useState('');
  if (!p) return <div className="container page"><StateBlock kind="empty" title="Không tìm thấy địa điểm" actions={<Button onClick={() => nav('/')}>Về trang chủ</Button>} /></div>;
  const types = [['address', 'Sai địa chỉ'], ['dup', 'Trùng địa điểm'], ['closed', 'Đã đóng cửa'], ['photo', 'Ảnh sai / gửi ảnh'], ['other', 'Nội dung khác']];
  const send = () => {
    if (!msg.trim() && type !== 'photo') { setErr('Hãy mô tả ngắn điều cần sửa.'); return; }
    setBusy(true);
    setTimeout(() => { const c = demoCode(); addContrib({ code: c, title: p.name, kind: 'Báo sai', status: 'pending', at: '02/11/2026' }); setCode(c); setBusy(false); }, 800);
  };
  if (code) return (
    <div className="container page form-narrow stack center">
      <div className="state" style={{ padding: 0 }}><div className="ico" style={{ background: 'var(--c-success-bg)', color: 'var(--c-success)' }}><CheckCircle2 size={32} /></div></div>
      <h1>Đã gửi đề xuất</h1><StatusBadge status="pending" />
      <p className="text-2">Bản công khai hiện hành của “{p.name}” được giữ cho đến khi Admin chấp thuận.</p>
      <div className="card"><span className="small muted">Mã tra cứu (DEMO)</span><div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 800, fontSize: 22 }}>{code}</div></div>
      <div className="row-wrap" style={{ justifyContent: 'center' }}><Button onClick={() => nav(`/theo-doi?ma=${code}`)}>Theo dõi</Button><Button variant="outline" onClick={() => nav(`/dia-diem/${p.id}`)}>Về địa điểm</Button></div>
    </div>
  );
  return (
    <div className="container page form-narrow stack-lg">
      <div><Link to={`/dia-diem/${p.id}`} className="small row" style={{ gap: 4 }}><ArrowLeft size={14} /> {p.name}</Link><h1 style={{ marginTop: 8 }}>Báo sai / đề xuất sửa</h1></div>
      <Field label="Bạn muốn báo điều gì?">
        <div className="row-wrap">{types.map(([k, l]) => <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>)}</div>
      </Field>
      <Field label="Mô tả" required={type !== 'photo'} htmlFor="r-msg" error={err} hint="Nêu rõ điều cần sửa và thông tin đúng nếu bạn biết."><textarea id="r-msg" className="textarea" value={msg} onChange={(e) => { setMsg(e.target.value); setErr(''); }} /></Field>
      {type === 'photo' && <div className="dropzone"><Camera size={22} /><div>Chọn ảnh từ thiết bị (mô phỏng)</div><p className="xs">Ảnh gửi vào mục ảnh cộng đồng, chờ Admin duyệt.</p></div>}
      <Banner type="info">Đề xuất được lưu riêng và chờ duyệt. Bạn không cần tài khoản; sẽ nhận mã tra cứu.</Banner>
      <Button size="lg" block loading={busy} onClick={send}>{busy ? 'Đang gửi…' : 'Gửi đề xuất'}</Button>
    </div>
  );
}

/* ===================== Theo dõi trạng thái đóng góp ===================== */
export function Track() {
  const { contribs } = useApp();
  const [sp] = useSearchParams();
  const [code, setCode] = useState(sp.get('ma') || '');
  const [res, setRes] = useState(undefined); // undefined=chưa tra | null=không thấy | obj
  const [busy, setBusy] = useState(false);
  const [supp, setSupp] = useState(''); const [supSent, setSupSent] = useState(false);
  const { toast } = useApp();
  const lookup = () => {
    setBusy(true); setSupSent(false);
    setTimeout(() => { setRes(contribs.find((c) => c.code.toLowerCase() === code.trim().toLowerCase()) || null); setBusy(false); }, 600);
  };
  const tl = (c) => {
    const base = [['Đã gửi', c.at, 'done']];
    if (c.status === 'pending') base.push(['Chờ Admin duyệt', '', 'current']);
    if (c.status === 'needs-info') base.push(['Chờ duyệt', '', 'done'], ['Admin yêu cầu bổ sung', 'Cần bạn phản hồi', 'current']);
    if (c.status === 'approved') base.push(['Chờ duyệt', '', 'done'], ['Đã duyệt & công khai', '', 'done']);
    if (c.status === 'rejected') base.push(['Chờ duyệt', '', 'done'], ['Bị từ chối', '', 'done']);
    return base;
  };
  return (
    <div className="container page form-narrow stack-lg">
      <div><h1>Theo dõi đóng góp</h1><p className="text-2">Nhập mã tra cứu bạn nhận được khi gửi đóng góp.</p></div>
      <form className="stack-sm" onSubmit={(e) => { e.preventDefault(); lookup(); }}>
        <Field label="Mã tra cứu" htmlFor="t-code" hint="Ví dụ mã demo: DEMO-2B8F-L4ZN (cần bổ sung), DEMO-5T1W-H6RC (đã duyệt), DEMO-9D4J-V2YE (từ chối)."><input id="t-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" spellCheck={false} /></Field>
        <Button type="submit" loading={busy} disabled={!code.trim()} block>Tra cứu</Button>
      </form>
      {res === null && <StateBlock kind="empty" title="Không tìm thấy đóng góp">Kiểm tra lại mã. Vì lý do an toàn, chúng tôi không cho biết mã có tồn tại hay không.</StateBlock>}
      {res && (
        <section className="card stack" aria-live="polite">
          <div className="row between"><div><h2>{res.title}</h2><span className="small muted">{res.kind}</span></div><StatusBadge status={res.status} /></div>
          <ol className="timeline">{tl(res).map(([a, b, c], i) => <li key={i} className={c}><b>{a}</b>{b && <div className="muted">{b}</div>}</li>)}</ol>
          {res.status === 'needs-info' && (<>
            <Banner type="info" title="Tin nhắn từ Admin:">{res.message}</Banner>
            {supSent ? <Banner type="success">Đã gửi bổ sung (mô phỏng). Hồ sơ quay lại trạng thái Chờ duyệt; bản cũ được giữ.</Banner> : (<>
              <Field label="Bổ sung của bạn" htmlFor="sp"><textarea id="sp" className="textarea" value={supp} onChange={(e) => setSupp(e.target.value)} /></Field>
              <Button disabled={!supp.trim()} onClick={() => { setSupSent(true); toast('Đã gửi bổ sung (mô phỏng)'); }}>Gửi bổ sung</Button></>)}
          </>)}
          {res.status === 'rejected' && <Banner type="danger" title="Lý do:">{res.reason}</Banner>}
          {res.status === 'approved' && <Link to="/tim-kiem" className="btn btn-outline">Xem trên 11Local</Link>}
          {['pending', 'needs-info'].includes(res.status) && <Button variant="danger-outline" size="sm" onClick={() => toast('Đã rút đóng góp (mô phỏng)', 'info')}>Rút đóng góp</Button>}
        </section>
      )}
    </div>
  );
}
