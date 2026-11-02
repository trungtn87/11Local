import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Smartphone, ShieldCheck, LogOut, ChevronRight, Store, Upload, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store.jsx';
import { byId } from '../data/demo.js';
import { Button, Field, Banner, StatusBadge, StateBlock, Steps, ManageBadge } from '../components/ui.jsx';

/* ===================== Đăng nhập / đăng ký bằng SĐT + OTP (mô phỏng) ===================== */
export function Login() {
  const { setRole, toast } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState(''); const [perr, setPerr] = useState('');
  const [nick, setNick] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); const [oerr, setOerr] = useState('');
  const [busy, setBusy] = useState(false); const [cd, setCd] = useState(0);
  const refs = useRef([]);
  useEffect(() => { if (cd <= 0) return; const t = setTimeout(() => setCd(cd - 1), 1000); return () => clearTimeout(t); }, [cd]);

  const sendOtp = () => {
    if (!/^(0|\+84)\d{9}$/.test(phone.replace(/\s/g, ''))) { setPerr('Số điện thoại chưa đúng. Ví dụ: 0912 345 678.'); return; }
    setPerr(''); setBusy(true);
    setTimeout(() => { setBusy(false); setStep('otp'); setCd(30); setTimeout(() => refs.current[0]?.focus(), 50); }, 700);
  };
  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1); setOerr('');
    setOtp((o) => o.map((x, k) => (k === i ? d : x)));
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const verify = () => {
    const code = otp.join('');
    if (code.length < 6) { setOerr('Nhập đủ 6 số.'); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (code === '000000') { setOerr('Mã không đúng hoặc đã hết hạn. Bạn còn 4 lần thử; có thể gửi lại mã sau khi hết đếm ngược.'); return; }
      setRole('member'); toast('Đăng nhập (mô phỏng) thành công — vai trò Thành viên', 'success'); nav('/tai-khoan');
    }, 700);
  };

  return (
    <div className="container page form-narrow stack-lg">
      <div className="center stack-sm"><div className="state" style={{ padding: 0 }}><div className="ico" style={{ background: 'var(--c-primary-50)', color: 'var(--c-primary-700)' }}><Smartphone size={30} /></div></div><h1>Đăng nhập / Đăng ký</h1><p className="text-2">Dùng số điện thoại và mã OTP. Không cần mật khẩu.</p></div>
      <Banner type="demo">Bản xem trước: chưa gửi OTP thật. Nhập <b>bất kỳ 6 số</b> để đăng nhập; nhập <b>000000</b> để xem trạng thái sai mã.</Banner>
      <Steps total={2} current={step === 'phone' ? 1 : 2} />
      {step === 'phone' ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
          <Field label="Số điện thoại" required htmlFor="ph" error={perr}><input id="ph" className={`input ${perr ? 'invalid' : ''}`} inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPerr(''); }} placeholder="09xx xxx xxx" /></Field>
          <Field label="Biệt danh hiển thị (khi đăng ký mới)" htmlFor="nk" hint="Dùng khi viết đánh giá. SĐT của bạn không bao giờ công khai."><input id="nk" className="input" value={nick} onChange={(e) => setNick(e.target.value)} /></Field>
          <Button type="submit" size="lg" block loading={busy}>Gửi mã OTP</Button>
          <p className="xs muted center">OTP chỉ xác minh bạn đang kiểm soát số điện thoại. Việc xác nhận quyền quản lý địa điểm do Admin quyết định riêng.</p>
        </form>
      ) : (
        <div className="stack">
          <p className="text-2 center">Mã đã gửi tới <b>{phone}</b> (mô phỏng). Mã có hạn dùng ngắn.</p>
          <div className="otp" role="group" aria-label="Mã OTP 6 số">{otp.map((d, i) => <input key={i} ref={(el) => (refs.current[i] = el)} value={d} inputMode="numeric" maxLength={1} aria-label={`Số thứ ${i + 1}`} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()} />)}</div>
          {oerr && <p className="err-text" role="alert" style={{ justifyContent: 'center' }}>{oerr}</p>}
          <Button size="lg" block loading={busy} onClick={verify}>Xác minh & đăng nhập</Button>
          <div className="row" style={{ justifyContent: 'center' }}><Button variant="ghost" size="sm" disabled={cd > 0} onClick={() => setCd(30)}>{cd > 0 ? `Gửi lại sau ${cd}s` : 'Gửi lại mã'}</Button><Button variant="ghost" size="sm" onClick={() => setStep('phone')}>Đổi số</Button></div>
        </div>
      )}
    </div>
  );
}

/* ===================== Tài khoản ===================== */
export function Account() {
  const { role, setRole, contribs, myReviews, claims, toast } = useApp();
  const nav = useNavigate();
  if (role === 'guest') return <div className="container page"><StateBlock kind="restricted" title="Bạn chưa đăng nhập" actions={<Button onClick={() => nav('/dang-nhap')}>Đăng nhập bằng SĐT</Button>}>Đăng nhập để viết đánh giá, xem lịch sử đóng góp và gửi yêu cầu quản lý địa điểm.</StateBlock></div>;
  const reviewList = Object.entries(myReviews);
  return (
    <div className="container page stack-lg form-narrow">
      <section className="card row">
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>D</span>
        <div className="grow"><h2>Biệt danh Demo</h2><div className="small text-2">SĐT đã xác minh: 09•• ••• 678</div><span className="badge badge-success" style={{ marginTop: 4 }}><ShieldCheck size={12} /> SĐT đã xác minh</span></div>
      </section>
      {(role === 'owner' || role === 'admin') && <Link to={role === 'owner' ? '/quan-ly' : '/admin'} className="btn btn-primary btn-block">{role === 'owner' ? 'Vào khu quản lý địa điểm' : 'Vào khu quản trị'} <ChevronRight size={16} /></Link>}

      <section className="stack-sm"><div className="row between"><h2>Đóng góp của tôi</h2><Link to="/theo-doi" className="small">Tra bằng mã</Link></div>
        {contribs.map((c) => (
          <Link to={`/theo-doi?ma=${c.code}`} key={c.code} className="queue-item" style={{ borderColor: 'var(--c-border)' }}>
            <div className="grow"><b>{c.title}</b><div className="small muted">{c.kind} · {c.at}</div></div><StatusBadge status={c.status} /><ChevronRight size={16} className="muted" />
          </Link>))}
      </section>

      <section className="stack-sm"><h2>Đánh giá của tôi</h2>
        {reviewList.length ? reviewList.map(([pid, r]) => <div key={pid} className="queue-item"><div className="grow"><b>{byId(pid)?.name}</b><div className="small muted">{r.stars} sao · {r.text || 'Không có nhận xét'}</div></div><StatusBadge status={r.status} /></div>)
          : <div className="card-flat small text-2">Bạn chưa có đánh giá nào. Mở một địa điểm để viết đánh giá.</div>}
      </section>

      <section className="stack-sm"><h2>Yêu cầu quản lý</h2>
        {claims.filter((c) => c.mine).length ? claims.filter((c) => c.mine).map((c) => <div key={c.id} className="queue-item"><div className="grow"><b>{c.place}</b></div><StatusBadge status={c.status} /></div>)
          : <div className="card-flat small text-2">Chưa có yêu cầu. Trên trang một địa điểm, chọn “Đây là địa điểm tôi quản lý”.</div>}
      </section>
      <Button variant="outline" icon={LogOut} onClick={() => { setRole('guest'); toast('Đã đăng xuất (mô phỏng)', 'info'); nav('/'); }}>Đăng xuất</Button>
    </div>
  );
}

/* ===================== Yêu cầu xác minh quyền quản lý ===================== */
export function Claim() {
  const { id } = useParams();
  const p = byId(id);
  const { role, setClaims, toast } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ rep: '', role: 'owner', phone: '', reason: '' });
  const [evid, setEvid] = useState(false); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [err, setErr] = useState({});
  if (!p) return <div className="container page"><StateBlock kind="empty" title="Không tìm thấy địa điểm" /></div>;
  if (role === 'guest') return <div className="container page"><StateBlock kind="restricted" title="Cần tài khoản để nhận quyền quản lý" actions={<Button onClick={() => nav('/dang-nhap')}>Đăng nhập bằng SĐT</Button>}>Yêu cầu quản lý cần tài khoản đã xác minh SĐT và được Admin xét duyệt thủ công.</StateBlock></div>;
  const submit = () => {
    const e = {}; if (!f.rep.trim()) e.rep = 'Nhập tên người đại diện.'; if (!f.reason.trim()) e.reason = 'Nêu lý do/căn cứ bạn có quyền đại diện.'; setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); setSent(true); setClaims((c) => [{ id: 'c' + Date.now(), place: p.name, placeId: p.id, who: f.rep, role: 'Tự khai', phoneMatch: false, at: '02/11/2026', status: 'pending', mine: true, note: f.reason, evidence: evid ? ['Tệp mẫu'] : [] }, ...c]); toast('Đã gửi yêu cầu (mô phỏng)'); }, 800);
  };
  if (sent) return (
    <div className="container page form-narrow stack center">
      <div className="state" style={{ padding: 0 }}><div className="ico" style={{ background: 'var(--c-success-bg)', color: 'var(--c-success)' }}><CheckCircle2 size={32} /></div></div>
      <h1>Đã gửi yêu cầu xác minh</h1><StatusBadge status="pending" />
      <p className="text-2">Admin sẽ kiểm tra liên hệ và căn cứ. Tài khoản <b>không tự được cấp quyền</b> chỉ vì OTP thành công hoặc SĐT trùng quán.</p>
      <Button variant="outline" onClick={() => nav('/tai-khoan')}>Xem trong tài khoản</Button>
    </div>
  );
  return (
    <div className="container page form-narrow stack-lg">
      <div><h1>Yêu cầu quyền quản lý</h1><p className="text-2">Địa điểm: <b>{p.name}</b> <ManageBadge managed={p.managed} /></p></div>
      {p.managed && <Banner type="warning" title="Địa điểm này đã có người quản lý.">Yêu cầu của bạn sẽ mở hồ sơ tranh chấp; quyền hiện tại không bị thu hồi hay chuyển tự động.</Banner>}
      <Field label="Tên người đại diện" required htmlFor="cl-rep" error={err.rep}><input id="cl-rep" className={`input ${err.rep ? 'invalid' : ''}`} value={f.rep} onChange={(e) => setF({ ...f, rep: e.target.value })} /></Field>
      <Field label="Vai trò của bạn với địa điểm" htmlFor="cl-role"><select id="cl-role" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="owner">Chủ cơ sở</option><option value="staff">Nhân viên / quản lý được ủy quyền</option><option value="family">Người thân của chủ</option><option value="other">Khác</option></select></Field>
      <Field label="Số liên hệ để xác nhận" htmlFor="cl-ph" hint="Có thể khác SĐT đăng nhập. Không công khai."><input id="cl-ph" inputMode="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Lý do / căn cứ" required htmlFor="cl-rs" error={err.reason}><textarea id="cl-rs" className={`textarea ${err.reason ? 'invalid' : ''}`} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <Field label="Bằng chứng (tùy chọn)" hint="Giấy phép, CCCD, email không bắt buộc cho mọi quán. Admin chỉ yêu cầu khi cần. Hồ sơ không công khai.">
        <div className="dropzone"><Upload size={22} /><div>{evid ? 'Đã đính kèm 1 tệp mẫu' : 'Chọn tệp (mô phỏng)'}</div><Button size="sm" variant="outline" onClick={() => setEvid(!evid)} style={{ marginTop: 6 }}>{evid ? 'Bỏ tệp' : 'Đính kèm tệp mẫu'}</Button></div>
      </Field>
      <Button size="lg" block loading={busy} onClick={submit}>Gửi yêu cầu</Button>
    </div>
  );
}
