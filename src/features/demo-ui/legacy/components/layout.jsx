import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookHeart, Clock, Home, LogIn, Map as MapIcon, User } from 'lucide-react';
import { Logo, SearchBar, Toasts } from './ui.jsx';
import { useApp } from '../store.jsx';

export function Header() {
  const { filters, setFilters, currentUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isAlbumRoute = location.pathname.startsWith('/tim-kiem') || location.pathname.startsWith('/album');
  const displayName = currentUser?.name || currentUser?.email || 'Tài khoản';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'G';

  return (
    <header className="app-header">
      <div className="container">
        <Logo />
        <div className="header-search">
          <SearchBar
            compact
            value={filters.q}
            onChange={(q) => setFilters((f) => ({ ...f, q }))}
            onSubmit={() => navigate('/tim-kiem')}
            placeholder="Tìm album, chuyến đi của Gấu…"
          />
        </div>
        <nav className="header-nav" aria-label="Điều hướng chính">
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/tim-kiem" className={isAlbumRoute ? 'active' : ''}>Album</NavLink>
          <NavLink to="/ban-do">Bản đồ</NavLink>
          <NavLink to="/dong-thoi-gian">Dòng thời gian</NavLink>
          {currentUser ? (
            <NavLink to="/tai-khoan" className="header-user-pill" aria-label={`Tài khoản ${displayName}`}>
              {currentUser.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={currentUser.avatarUrl} alt="" referrerPolicy="no-referrer" className="header-avatar-img" />
              ) : (
                <span className="header-avatar-fallback">{initial}</span>
              )}
              <span>{displayName.split(' ')[0]}</span>
            </NavLink>
          ) : (
            <NavLink to="/dang-nhap" className="btn btn-accent btn-sm">
              <LogIn size={16} /> Đăng nhập Google
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { currentUser } = useApp();
  const location = useLocation();
  const isAlbumRoute = location.pathname.startsWith('/tim-kiem') || location.pathname.startsWith('/album');
  const isAccountRoute = location.pathname.startsWith('/tai-khoan') || location.pathname.startsWith('/dang-nhap');

  const items = [
    { to: '/', label: 'Trang chủ', Icon: Home, end: true, forceActive: false },
    { to: '/tim-kiem', label: 'Album', Icon: BookHeart, end: false, forceActive: isAlbumRoute },
    { to: '/ban-do', label: 'Bản đồ', Icon: MapIcon, end: false, forceActive: false },
    { to: '/dong-thoi-gian', label: 'Thời gian', Icon: Clock, end: false, forceActive: false },
    { to: currentUser ? '/tai-khoan' : '/dang-nhap', label: 'Tài khoản', Icon: User, end: false, forceActive: isAccountRoute },
  ];

  return (
    <nav className="bottom-nav" aria-label="Điều hướng dưới">
      {items.map(({ to, label, Icon, end, forceActive }) => (
        <NavLink
          key={label}
          to={to}
          end={end}
          className={({ isActive }) => (isActive || forceActive ? 'active' : '')}
        >
          <Icon size={21} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="footer hide-mobile">
      <div className="container row between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <b>Nhà của Gấu</b> — Nơi lưu giữ những năm tháng yêu thương.
        </div>
        <div className="muted" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="/dong-gop">Cùng góp kỷ niệm</a>
          <a href="/chinh-sach-bao-mat">Chính sách bảo mật</a>
          <a href="/dieu-khoan-su-dung">Điều khoản sử dụng</a>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children, hideFooter }) {
  const location = useLocation();
  return (
    <>
      <Header />
      <main className="app-main" id="main" key={location.pathname}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </>
  );
}

export { Toasts };
