import { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, Map as MapIcon, PlusCircle, User, SlidersHorizontal, Eye, ShieldCheck, Store, LayoutDashboard, ClipboardList, Building2, BadgeCheck, LogOut } from 'lucide-react';
import { Logo, SearchBar, Toasts, Banner } from './ui.jsx';
import { useApp } from '../store.jsx';

export function DemoRibbon() {
  return <div className="demo-ribbon" role="note"><b>DEMO</b>UI preview V1 · dữ liệu hư cấu — chưa kết nối backend, tài khoản, bản đồ thật. Không phải địa điểm/đánh giá/số liệu thật.</div>;
}

export function Header() {
  const { filters, setFilters, role } = useApp();
  const nav = useNavigate();
  const { pathname } = useLocation();
  return (
    <header className="app-header">
      <div className="container">
        <Logo />
        <div className={`header-search ${pathname === '/' ? 'home-search-hidden' : ''}`}>
          <SearchBar compact value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} onSubmit={() => nav('/tim-kiem')} placeholder="Tìm quán, cafe, điểm đến…" />
        </div>
        <nav className="header-nav" aria-label="Điều hướng chính">
          <NavLink to="/" end>Khám phá</NavLink>
          <NavLink to="/tim-kiem">Danh mục</NavLink>
          <NavLink to="/ban-do">Bản đồ</NavLink>
          <NavLink to="/dong-gop">Đóng góp</NavLink>
          {role === 'owner' && <NavLink to="/quan-ly">Quản lý quán</NavLink>}
          {role === 'admin' && <NavLink to="/admin">Quản trị</NavLink>}
          <NavLink to={role === 'guest' ? '/dang-nhap' : '/tai-khoan'} className="btn btn-outline btn-sm" style={{ marginLeft: 8 }}>
            <User size={16} /> {role === 'guest' ? 'Đăng nhập' : 'Tài khoản'}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { role } = useApp();
  const items = [
    ['/', 'Khám phá', Compass, true],
    ['/ban-do', 'Bản đồ', MapIcon],
    ['/dong-gop', 'Đóng góp', PlusCircle, false, 'fab-slot'],
    [role === 'guest' ? '/dang-nhap' : '/tai-khoan', 'Tài khoản', User],
  ];
  return (
    <nav className="bottom-nav" aria-label="Điều hướng dưới">
      {items.map(([to, label, I, end, cls]) => (
        <NavLink key={label} to={to} end={end} className={({ isActive }) => `${cls || ''} ${isActive ? 'active' : ''}`}>
          <I size={22} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function LegacyFooter() {
  return (
    <footer className="footer hide-mobile">
      <div className="container row between" style={{ flexWrap: 'wrap' }}>
        <div><b>11Local</b> — Cẩm nang địa điểm Cao Bằng. Độc lập với 11Ship và 11Food.</div>
        <div className="muted">UI preview V1 · dữ liệu demo hư cấu</div>
      </div>
    </footer>
  );
}

export function Footer() {
  return (
    <footer className="footer hide-mobile">
      <div className="container row between" style={{ flexWrap: 'wrap' }}>
        <div><b>11Local</b> — Cẩm nang địa điểm Cao Bằng.</div>
        <div className="muted">Dữ liệu địa điểm công khai từ Neon</div>
      </div>
    </footer>
  );
}

/* Công cụ xem trước: đổi vai trò & ép trạng thái. CHỈ là công tắc giao diện, không phải phân quyền. */
export function PreviewTools() {
  const { role, setRole, forced, setForced, toast } = useApp();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const roles = [['guest', 'Khách', Eye], ['member', 'Thành viên', User], ['owner', 'Chủ địa điểm', Store], ['admin', 'Admin', ShieldCheck]];
  const states = [['none', 'Bình thường'], ['loading', 'Đang tải'], ['empty', 'Trống'], ['error', 'Lỗi'], ['offline', 'Mất mạng']];
  const pick = (r) => {
    setRole(r);
    toast(`Xem trước giao diện với vai trò: ${roles.find((x) => x[0] === r)[1]}`, 'info');
    if (r === 'owner') nav('/quan-ly'); else if (r === 'admin') nav('/admin'); else if (r === 'guest' || r === 'member') nav('/');
  };
  return (
    <>
      {open && (
        <div className="pt-panel" role="dialog" aria-label="Công cụ xem trước">
          <div className="stack-sm">
            <Banner type="demo">Công tắc này chỉ đổi <b>giao diện hiển thị</b>. Không phải xác thực hay phân quyền thật.</Banner>
            <h4>Xem giao diện theo vai trò</h4>
            <div className="row-wrap">{roles.map(([id, l, I]) => <button key={id} className="chip" aria-pressed={role === id} onClick={() => pick(id)}><I size={14} />{l}</button>)}</div>
            <h4 style={{ marginTop: 8 }}>Ép trạng thái danh sách / bản đồ</h4>
            <div className="row-wrap">{states.map(([id, l]) => <button key={id} className="chip" aria-pressed={forced === id} onClick={() => setForced(id)}>{l}</button>)}</div>
          </div>
        </div>
      )}
      <button className="pt-fab" aria-label="Công cụ xem trước" aria-expanded={open} onClick={() => setOpen(!open)}><SlidersHorizontal size={20} /></button>
    </>
  );
}

/* Khung khu quản lý (Admin / Chủ địa điểm) — thanh điều hướng riêng, không lẫn nội dung khách (v1 tr.4) */
export function MgmtShell({ kind, children }) {
  const { role, setRole } = useApp();
  const nav = useNavigate();
  const isAdmin = kind === 'admin';
  const tabs = isAdmin
    ? [['/admin', 'Tổng quan', LayoutDashboard, true], ['/admin/hang-cho', 'Hàng chờ', ClipboardList], ['/admin/dia-diem', 'Địa điểm', Building2], ['/admin/xac-minh', 'Xác minh quản lý', BadgeCheck]]
    : [['/quan-ly', 'Tổng quan', LayoutDashboard, true], ['/quan-ly/chinh-sua/p1', 'Thông tin & ảnh', Building2]];
  return (
    <div className="mgmt">
      <div className={`mgmt-top ${isAdmin ? '' : 'owner'}`}>
        <div className="container">
          <div className="brand"><Logo to="/" /><small>{isAdmin ? 'Quản trị' : 'Quản lý địa điểm'}</small></div>
          <div className="row">
            <Link to="/" className="btn btn-sm" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }}>Xem trang khách</Link>
            <button className="btn btn-sm btn-icon" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }} aria-label="Thoát chế độ xem trước" onClick={() => { setRole('guest'); nav('/'); }}><LogOut size={16} /></button>
          </div>
        </div>
      </div>
      <nav className={`mgmt-nav ${isAdmin ? '' : 'owner'}`} aria-label="Điều hướng quản lý">
        <div className="container">{tabs.map(([to, l, I, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}><I size={16} />{l}</NavLink>)}</div>
      </nav>
      <div className="container page">
        <div style={{ marginBottom: 'var(--s-4)' }}><Banner type="demo">Giao diện xem trước {isAdmin ? 'Admin' : 'chủ địa điểm'} — thao tác chỉ mô phỏng trên màn hình, <b>không lưu dữ liệu, không có quyền thật</b>.</Banner></div>
        {children}
      </div>
    </div>
  );
}

export function PublicShell({ children, hideFooter }) {
  const loc = useLocation();
  return (
    <>
      <Header />
      <main className="app-main" id="main" key={loc.pathname}>{children}</main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </>
  );
}

export { Toasts };
