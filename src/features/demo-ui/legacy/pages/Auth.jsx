import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../store.jsx';
import { Button, Banner, StateBlock } from '../components/ui.jsx';

export function Login() {
  const { currentUser, authState } = useApp();
  const navigate = useNavigate();
  const error = new URLSearchParams(window.location.search).get('error');
  const messages = {
    cancelled: 'Bạn đã hủy đăng nhập Google.',
    not_configured: 'Đăng nhập Google chưa được cấu hình trên máy chủ.',
    invalid_state: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',
    invalid_callback: 'Google trả về dữ liệu đăng nhập không hợp lệ.',
    token_exchange_failed: 'Không thể hoàn tất xác thực với Google.',
    missing_identity: 'Google không trả về thông tin tài khoản.',
    invalid_identity: 'Không thể xác minh tài khoản Google.',
    account_failed: 'Không thể tạo tài khoản 11Local.',
    auth_failed: 'Đăng nhập tạm thời không khả dụng.',
  };
  if (currentUser) return <div className="container page form-narrow"><StateBlock title="Bạn đã đăng nhập" actions={<Button onClick={() => navigate('/tai-khoan')}>Mở tài khoản</Button>}>Đang dùng tài khoản Google {currentUser.email}.</StateBlock></div>;
  return <div className="container page form-narrow stack-lg">
    <div className="center stack-sm"><h1>Đăng nhập / Đăng ký</h1><p className="text-2">11Local chỉ dùng tài khoản Google. Không OTP, không mật khẩu riêng.</p></div>
    {messages[error] && <Banner type="warning">{messages[error]}</Banner>}
    {authState === 'error' && <Banner type="warning">Không đọc được trạng thái đăng nhập hiện tại.</Banner>}
    <Button size="lg" block icon={LogIn} onClick={() => window.location.assign('/api/auth/google/start?returnTo=%2Ftai-khoan')}>Tiếp tục với Google</Button>
    <p className="xs muted center">Quyền quản lý địa điểm cần Admin xét duyệt riêng.</p>
  </div>;
}

export function Account() {
  const { currentUser, authState, setCurrentUser, toast } = useApp();
  const navigate = useNavigate();
  if (authState === 'loading') return <div className="container page"><StateBlock title="Đang kiểm tra phiên Google">Đang xác thực phiên tài khoản thật…</StateBlock></div>;
  if (!currentUser) return <div className="container page"><StateBlock kind="restricted" title="Bạn chưa đăng nhập" actions={<Button onClick={() => navigate('/dang-nhap')}>Đăng nhập bằng Google</Button>}>11Local không có tài khoản hoặc lịch sử mẫu.</StateBlock></div>;
  const name = currentUser.name || currentUser.email || 'Người dùng';
  const letter = name.trim().charAt(0).toUpperCase() || 'U';
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      setCurrentUser(null);
      toast('Đã đăng xuất', 'info');
      navigate('/');
    } catch { toast('Chưa đăng xuất được. Vui lòng thử lại.', 'error'); }
  };
  return <div className="container page stack-lg form-narrow">
    <section className="card row">
      {currentUser.avatarUrl
        ? <img className="avatar" src={currentUser.avatarUrl} alt="" referrerPolicy="no-referrer" style={{ width: 56, height: 56, objectFit: 'cover' }}/>
        : <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{letter}</span>}
      <div className="grow"><h2>{name}</h2><div className="small text-2">{currentUser.email}</div><span className="badge badge-success"><ShieldCheck size={12}/> Đã đăng nhập bằng Google</span></div>
    </section>
    <div className="card-flat small text-2">Lịch sử đánh giá, đóng góp và yêu cầu quản lý sẽ chỉ hiển thị khi được kết nối dữ liệu thật. Không hiển thị dữ liệu mô phỏng.</div>
    <Button variant="outline" icon={LogOut} onClick={logout}>Đăng xuất</Button>
  </div>;
}
