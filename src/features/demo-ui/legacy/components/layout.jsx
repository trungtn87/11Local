import { HomeStats } from "@/components/home-stats";
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Map as MapIcon, PlusCircle, User } from 'lucide-react';
import { Logo, SearchBar, Toasts } from './ui.jsx';
import { useApp } from '../store.jsx';

export function Header() {
  const { filters, setFilters, currentUser } = useApp();
  const navigate = useNavigate();
  return <header className="app-header"><div className="container">
    <Logo />
    <div className="header-search"><SearchBar compact value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} onSubmit={() => navigate('/tim-kiem')} placeholder="Tìm địa điểm…" /></div>
    <nav className="header-nav" aria-label="Điều hướng chính">
      <NavLink to="/" end>Khám phá</NavLink>
      <NavLink to="/tim-kiem">Danh mục</NavLink>
      <NavLink to="/ban-do">Bản đồ</NavLink>
      <NavLink to="/dong-gop">Đóng góp</NavLink>
      <NavLink to={currentUser ? '/tai-khoan' : '/dang-nhap'} className="btn btn-outline btn-sm"><User size={16}/>{currentUser ? 'Tài khoản' : 'Đăng nhập'}</NavLink>
    </nav>
  </div></header>;
}

export function BottomNav() {
  const { currentUser } = useApp();
  const items = [
    ['/', 'Khám phá', Compass, true, ''],
    ['/ban-do', 'Bản đồ', MapIcon, false, ''],
    ['/dong-gop', 'Đóng góp', PlusCircle, false, 'fab-slot'],
    [currentUser ? '/tai-khoan' : '/dang-nhap', 'Tài khoản', User, false, ''],
  ];
  return <nav className="bottom-nav" aria-label="Điều hướng dưới">
    {items.map(([to,label,Icon,end,css]) => <NavLink key={label} to={to} end={end} className={({ isActive }) => css + (isActive ? ' active' : '')}><Icon size={22}/>{label}</NavLink>)}
  </nav>;
}

export function Footer() {
  return <footer className="footer hide-mobile"><div className="container row between" style={{ flexWrap: 'wrap' }}>
    <div><b>11Local</b> — Cẩm nang địa điểm Cao Bằng.</div>
    <div className="muted">Chỉ hiển thị dữ liệu địa điểm đã được Admin duyệt.</div>
  </div></footer>;
}

export function PublicShell({ children, hideFooter }) {
  const location = useLocation();
  return <>
    <Header />
    <main className="app-main" id="main" key={location.pathname}>{children}</main>
    {location.pathname === "/" && <HomeStats />}
    {!hideFooter && <Footer />}
    <BottomNav />
  </>;
}

export { Toasts };
