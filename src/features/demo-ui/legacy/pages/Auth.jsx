import { safeReturnTo } from '@/lib/google-auth';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, Camera, CheckCircle2, Clock, FileCheck2, Info, LogIn, LogOut, ShieldCheck, XCircle,
} from 'lucide-react';
import { useApp } from '../store.jsx';
import { Button, Banner, StateBlock } from '../components/ui.jsx';
import { GauLogoMark } from '@/components/gau-mascot';

export function Login() {
  const { currentUser, authState } = useApp();
  const navigate = useNavigate();
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const error = params.get('error');
  const returnTo = safeReturnTo(params.get('returnTo'));
  const messages = {
    cancelled: 'Bạn đã hủy đăng nhập Google.',
    not_configured: 'Đăng nhập Google chưa được cấu hình trên máy chủ.',
    invalid_state: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',
    invalid_callback: 'Google trả về dữ liệu đăng nhập không hợp lệ.',
    token_exchange_failed: 'Không thể hoàn tất xác thực với Google.',
    missing_identity: 'Google không trả về thông tin tài khoản.',
    invalid_identity: 'Không thể xác minh tài khoản Google.',
    account_failed: 'Không thể tạo tài khoản.',
    auth_failed: 'Đăng nhập tạm thời không khả dụng.',
  };

  if (currentUser) {
    return (
      <div className="container page form-narrow">
        <StateBlock
          title="Bạn đã đăng nhập"
          actions={<Button onClick={() => navigate(returnTo)}>Mở trang Tài khoản</Button>}
        >
          Đang dùng tài khoản Google {currentUser.email}.
        </StateBlock>
      </div>
    );
  }

  return (
    <div className="container page form-narrow stack-lg">
      <div className="card stack center" style={{ alignItems: 'center', padding: '32px 24px' }}>
        <GauLogoMark width={64} height={64} />
        <div className="stack-sm">
          <h1>Đăng nhập Nhà của Gấu</h1>
          <p className="text-2">
            Mọi người có thể xem album, hình ảnh và chuyến đi công khai mà không cần đăng nhập. Khi đăng nhập bằng Google, bạn có thể đóng góp thêm ảnh kỷ niệm cho Gấu.
          </p>
        </div>
        {messages[error] && <Banner type="warning">{messages[error]}</Banner>}
        {authState === 'error' && (
          <Banner type="warning">Không đọc được trạng thái đăng nhập hiện tại.</Banner>
        )}
        <Button
          size="lg"
          block
          variant="accent"
          icon={LogIn}
          onClick={() =>
            window.location.assign('/api/auth/google/start?returnTo=' + encodeURIComponent(returnTo))
          }
        >
          Tiếp tục với tài khoản Google
        </Button>
        <p className="xs muted">
          Ảnh do người dùng đóng góp sẽ được Admin duyệt trước khi hiển thị công khai.
        </p>
      </div>
    </div>
  );
}

export function Account() {
  const { currentUser, authState, setCurrentUser, toast } = useApp();
  const navigate = useNavigate();

  if (authState === 'loading') {
    return (
      <div className="container page">
        <StateBlock title="Đang kiểm tra phiên Google">
          Đang xác thực tài khoản thật của bạn…
        </StateBlock>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container page">
        <StateBlock
          kind="restricted"
          title="Bạn chưa đăng nhập"
          actions={<Button variant="accent" icon={LogIn} onClick={() => navigate('/dang-nhap')}>Đăng nhập bằng Google</Button>}
        >
          Hãy đăng nhập bằng tài khoản Google để xem thông tin tài khoản và đóng góp ảnh kỷ niệm cho Gấu.
        </StateBlock>
      </div>
    );
  }

  const name = currentUser.name || currentUser.email || 'Thành viên gia đình';
  const letter = name.trim().charAt(0).toUpperCase() || 'G';

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      setCurrentUser(null);
      toast('Đã đăng xuất khỏi tài khoản Google', 'info');
      navigate('/');
    } catch {
      toast('Chưa đăng xuất được. Vui lòng thử lại.', 'error');
    }
  };

  return (
    <div className="container page stack-lg form-narrow">
      {/* Google Profile Card */}
      <section className="card row gau-account-profile" style={{ flexWrap: 'wrap' }}>
        {currentUser.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="avatar"
            src={currentUser.avatarUrl}
            alt={`Ảnh đại diện của ${name}`}
            referrerPolicy="no-referrer"
            style={{ width: 64, height: 64, objectFit: 'cover', border: '2px solid #F9C84B' }}
          />
        ) : (
          <span className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
            {letter}
          </span>
        )}
        <div className="grow stack-sm" style={{ gap: 4 }}>
          <h2>{name}</h2>
          <div className="small text-2">{currentUser.email}</div>
          <div>
            <span className="badge badge-success">
              <ShieldCheck size={12} /> Đã đăng nhập Google
            </span>
          </div>
        </div>
      </section>

      {/* Contributed Photos & Moderation Status Section */}
      <section className="card stack">
        <div className="row between" style={{ flexWrap: 'wrap' }}>
          <h3>📸 Danh sách ảnh kỷ niệm đã đóng góp</h3>
          <Link to="/dong-gop" className="btn btn-primary btn-sm">
            <Camera size={15} /> Góp thêm ảnh
          </Link>
        </div>

        <div className="row-wrap" aria-label="Các trạng thái xét duyệt">
          <span className="badge badge-warning">
            <Clock size={12} /> Chờ duyệt
          </span>
          <span className="badge badge-success">
            <CheckCircle2 size={12} /> Đã duyệt
          </span>
          <span className="badge badge-danger">
            <XCircle size={12} /> Bị từ chối
          </span>
        </div>

        <div className="card-flat stack-sm">
          <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--c-primary-700)' }} />
            <div className="small text-2">
              <b>Ghi chú kỹ thuật (UI chuẩn bị):</b> API liệt kê tự động toàn bộ ảnh đã đóng góp theo từng tài khoản Google đang được chuẩn bị cho giai đoạn backend tiếp theo (hiện hệ thống không tạo dữ liệu giả lập). Bạn có thể tra cứu trực tiếp trạng thái duyệt (<i>Chờ duyệt / Đã duyệt / Bị từ chối</i>) bằng mã liên kết theo dõi đã nhận khi gửi ảnh.
            </div>
          </div>
          <div className="row-wrap" style={{ marginTop: 4 }}>
            <Link className="btn btn-outline btn-sm" to="/theo-doi">
              Tra cứu đóng góp theo liên kết đã lưu
            </Link>
          </div>
        </div>
      </section>

      {/* Existing Ownership & Management Links */}
      <section className="card stack-sm">
        <h3>Quản lý nội dung & xác minh</h3>
        <p className="small text-2">
          Xem các yêu cầu xác minh hoặc các trang kỷ niệm/địa điểm được cấp quyền quản lý trên tài khoản Google hiện tại.
        </p>
        <div className="row-wrap">
          <Link className="btn btn-outline" to="/yeu-cau-nhan-quyen">
            <FileCheck2 size={17} /> Yêu cầu xác minh đã gửi
          </Link>
          <Link className="btn btn-outline" to="/quan-ly">
            <BadgeCheck size={17} /> Nội dung được cấp quyền
          </Link>
        </div>
      </section>

      <Button variant="danger-outline" icon={LogOut} onClick={logout}>
        Đăng xuất tài khoản Google
      </Button>
    </div>
  );
}
