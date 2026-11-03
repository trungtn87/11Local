import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, LogOut, ChevronRight, Upload, CheckCircle2, LogIn } from 'lucide-react';
import { useApp } from '../store.jsx';
import { byId } from '../data/demo.js';
import { Button, Field, Banner, StatusBadge, StateBlock, ManageBadge } from '../components/ui.jsx';

/* ===================== Đăng nhập / đăng ký bằng Google ===================== */
export function Login() {
  const { currentUser, authState } = useApp();
  const nav = useNavigate();
  const error = new URLSearchParams(window.location.search).get('error');
  const errorText = {
    cancelled: 'Bạn đã hủy đăng nhập Google.',
    not_configured: 'Đăng nhập Google chưa được cấu hình trên máy chủ.',
    invalid_state: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',
    invalid_callback: 'Google trả về dữ liệu đăng nhập không hợp lệ.',
    token_exchange_failed: 'Không thể hoàn tất xác thực với Google.',
    missing_identity: 'Google không trả về thông tin tài khoản.',
    invalid_identity: 'Không thể xác minh tài khoản Google.',
    account_failed: 'Không thể tạo tài khoản 11Local.',
    auth_failed: 'Đăng nhập tạm thời không khả dụng.',
  }[error] || null;

  if (currentUser) {
    return (
      <div className="container page form-narrow">
        <StateBlock kind="success" title="Bạn đã đăng nhập" actions={<Button onClick={() => nav('/tai-khoan')}>Mở tài khoản</Button>}>
          Đang dùng tài khoản Google <b>{currentUser.email}</b>.
        </StateBlock>
      </div>
    );
  }

  return (
    <div className="container page form-narrow stack-lg">
      <div className="center stack-sm">
        <div className="state" style={{ padding: 0 }}>
          <div className="ico" style={{ background: 'var(--c-primary-50)', color: 'var(--c-primary-700)' }}><LogIn size={30} /></div>
        </div>
        <h1>Đăng nhập / Đăng ký</h1>
        <p className="text-2">11Local chỉ dùng tài khoản Google. Không OTP, không mật khẩu riêng.</p>
      </div>
      {errorText && <Banner type="error">{errorText}</Banner>}
      {authState === 'error' && <Banner type="warning">Không đọc được phiên đăng nhập hiện tại. Bạn vẫn có thể thử đăng nhập lại bằng Google.</Banner>}
      <Button size="lg" block icon={LogIn} onClick={() => window.location.assign('/api/auth/google/start?returnTo=%2Ftai-khoan')}>
        Tiếp tục với Google
      </Button>
      <p className="xs muted center">Google chỉ dùng để xác thực tài khoản. Quyền quản lý địa điểm vẫn do Admin 11Local xét duyệt riêng.</p>
    </div>
  );
}

/* ===================== Tài khoản ===================== */
export function Account() {
  const { role, setRole, contribs, myReviews, claims, toast, currentUser, setCurrentUser, authState } = useApp();
  const nav = useNavigate();

  if (authState === 'loading' && role === 'guest') {
    return <div className="container page"><StateBlock title="Đang kiểm tra đăng nhập">Đang đọc phiên tài khoản Google…</StateBlock></div>;
  }
  if (role === 'guest' && !currentUser) {
    return <div className="container page"><StateBlock kind="restricted" title="Bạn chưa đăng nhập" actions={<Button onClick={() => nav('/dang-nhap')}>Đăng nhập bằng Google</Button>}>Đăng nhập để viết đánh giá, xem lịch sử đóng góp và gửi yêu cầu quản lý địa điểm.</StateBlock></div>;
  }

  const reviewList = Object.entries(myReviews);
  const displayName = currentUser?.name || 'Tài khoản xem trước';
  const email = currentUser?.email || 'Vai trò giao diện demo';
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setCurrentUser(null);
    setRole('guest');
    toast('Đã đăng xuất', 'info');
    nav('/');
  };

  return (
    <div className="container page stack-lg form-narrow">
      <section className="card row">
        {currentUser?.avatarUrl
          ? <img className="avatar" src={currentUser.avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: 56, height: 56, objectFit: 'cover' }} />
          : <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{avatarLetter}</span>}
        <div className="grow">
          <h2>{displayName}</h2>
          <div className="small text-2">{email}</div>
          {currentUser && <span className="badge badge-success" style={{ marginTop: 4 }}><ShieldCheck size={12} /> Google đã xác minh</span>}
        </div>
      </section>
      {(role === 'owner' || role === 'admin') && <Link to={role === 'owner' ? '/quan-ly' : '/admin'} className="btn btn-primary btn-block">{role === 'owner' ? 'Vào khu quản lý địa điểm' : 'Vào khu quản trị'} <ChevronRight size={16} /></Link>}

      <section className="stack-sm"><div className="row between"><h2>Đóng góp của tôi</h2><Link to="/theo-doi" className="small">Tra bằng mã</Link></div>
        {contribs.map((item) => (
          <Link to={`/theo-doi?ma=${item.code}`} key={item.code} className="queue-item" style={{ borderColor: 'var(--c-border)' }}>
            <div className="grow"><b>{item.title}</b><div className="small muted">{item.kind} · {item.at}</div></div><StatusBadge status={item.status} /><ChevronRight size={16} className="muted" />
          </Link>))}
      </section>

      <section className="stack-sm"><h2>Đánh giá của tôi</h2>
        {reviewList.length ? reviewList.map(([pid, review]) => <div key={pid} className="queue-item"><div className="grow"><b>{byId(pid)?.name}</b><div className="small muted">{review.stars} sao · {review.text || 'Không có nhận xét'}</div></div><StatusBadge status={review.status} /></div>)
          : <div className="card-flat small text-2">Bạn chưa có đánh giá nào. Mở một địa điểm để viết đánh giá.</div>}
      </section>

      <section className="stack-sm"><h2>Yêu cầu quản lý</h2>
        {claims.filter((claim) => claim.mine).length ? claims.filter((claim) => claim.mine).map((claim) => <div key={claim.id} className="queue-item"><div className="grow"><b>{claim.place}</b></div><StatusBadge status={claim.status} /></div>)
          : <div className="card-flat small text-2">Chưa có yêu cầu. Trên trang một địa điểm, chọn “Đây là địa điểm tôi quản lý”.</div>}
      </section>
      <Button variant="outline" icon={LogOut} onClick={logout}>Đăng xuất</Button>
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
  if (role === 'guest') return <div className="container page"><StateBlock kind="restricted" title="Cần tài khoản để nhận quyền quản lý" actions={<Button onClick={() => nav('/dang-nhap')}>Đăng nhập bằng Google</Button>}>Yêu cầu quản lý cần tài khoản Google đã xác minh và vẫn được Admin xét duyệt thủ công.</StateBlock></div>;
  const submit = () => {
    const e = {}; if (!f.rep.trim()) e.rep = 'Nhập tên người đại diện.'; if (!f.reason.trim()) e.reason = 'Nêu lý do/căn cứ bạn có quyền đại diện.'; setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); setSent(true); setClaims((c) => [{ id: 'c' + Date.now(), place: p.name, placeId: p.id, who: f.rep, role: 'Tự khai', phoneMatch: false, at: '02/11/2026', status: 'pending', mine: true, note: f.reason, evidence: evid ? ['Tệp mẫu'] : [] }, ...c]); toast('Đã gửi yêu cầu (mô phỏng)'); }, 800);
  };
  if (sent) return (
    <div className="container page form-narrow stack center">
      <div className="state" style={{ padding: 0 }}><div className="ico" style={{ background: 'var(--c-success-bg)', color: 'var(--c-success)' }}><CheckCircle2 size={32} /></div></div>
      <h1>Đã gửi yêu cầu xác minh</h1><StatusBadge status="pending" />
      <p className="text-2">Admin sẽ kiểm tra liên hệ và căn cứ. Tài khoản <b>không tự được cấp quyền</b> chỉ vì đăng nhập Google hoặc có số liên hệ trùng với địa điểm.</p>
      <Button variant="outline" onClick={() => nav('/tai-khoan')}>Xem trong tài khoản</Button>
    </div>
  );
  return (
    <div className="container page form-narrow stack-lg">
      <div><h1>Yêu cầu quyền quản lý</h1><p className="text-2">Địa điểm: <b>{p.name}</b> <ManageBadge managed={p.managed} /></p></div>
      {p.managed && <Banner type="warning" title="Địa điểm này đã có người quản lý.">Yêu cầu của bạn sẽ mở hồ sơ tranh chấp; quyền hiện tại không bị thu hồi hay chuyển tự động.</Banner>}
      <Field label="Tên người đại diện" required htmlFor="cl-rep" error={err.rep}><input id="cl-rep" className={`input ${err.rep ? 'invalid' : ''}`} value={f.rep} onChange={(e) => setF({ ...f, rep: e.target.value })} /></Field>
      <Field label="Vai trò của bạn với địa điểm" htmlFor="cl-role"><select id="cl-role" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="owner">Chủ cơ sở</option><option value="staff">Nhân viên / quản lý được ủy quyền</option><option value="family">Người thân của chủ</option><option value="other">Khác</option></select></Field>
      <Field label="Số liên hệ để xác nhận" htmlFor="cl-ph" hint="Thông tin liên hệ riêng cho hồ sơ xác minh. Không dùng để đăng nhập và không công khai."><input id="cl-ph" inputMode="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Lý do / căn cứ" required htmlFor="cl-rs" error={err.reason}><textarea id="cl-rs" className={`textarea ${err.reason ? 'invalid' : ''}`} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <Field label="Bằng chứng (tùy chọn)" hint="Giấy phép, CCCD, email không bắt buộc cho mọi quán. Admin chỉ yêu cầu khi cần. Hồ sơ không công khai.">
        <div className="dropzone"><Upload size={22} /><div>{evid ? 'Đã đính kèm 1 tệp mẫu' : 'Chọn tệp (mô phỏng)'}</div><Button size="sm" variant="outline" onClick={() => setEvid(!evid)} style={{ marginTop: 6 }}>{evid ? 'Bỏ tệp' : 'Đính kèm tệp mẫu'}</Button></div>
      </Field>
      <Button size="lg" block loading={busy} onClick={submit}>Gửi yêu cầu</Button>
    </div>
  );
}
