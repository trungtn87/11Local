import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import { DemoRibbon, PublicShell, PreviewTools, Toasts } from './components/layout.jsx';
import { StateBlock, Button } from './components/ui.jsx';
import { Search } from './pages/Public.jsx';
import { RealMapExplorer } from './pages/RealMapExplorer.jsx';
import { DiscoveryHome as Home } from './pages/DiscoveryHome.jsx';
import { PlaceDetail } from './pages/Detail.jsx';
import { RealPlaceDetail } from './pages/RealPlaceDetail.jsx';
import { Contribute, ReportError, Track } from './pages/Contribute.jsx';
import { Login, Account, Claim } from './pages/Auth.jsx';
import { OwnerDashboard, OwnerEdit } from './pages/Owner.jsx';
import { AdminHome, AdminQueue, AdminReview, AdminPlaces, AdminClaims } from './pages/Admin.jsx';

const pub = (el, opts) => <PublicShell {...opts}>{el}</PublicShell>;

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      {pathname !== '/' && <DemoRibbon />}
      <Routes>
        <Route path="/" element={pub(<Home />)} />
        <Route path="/tim-kiem" element={pub(<Search />)} />
        <Route path="/ban-do" element={pub(<RealMapExplorer />, { hideFooter: true })} />
        <Route path="/dia-diem/real/:slug" element={pub(<RealPlaceDetail />)} />
        <Route path="/dia-diem/:id" element={pub(<PlaceDetail />)} />
        <Route path="/dong-gop" element={pub(<Contribute />)} />
        <Route path="/bao-sai/:id" element={pub(<ReportError />)} />
        <Route path="/theo-doi" element={pub(<Track />)} />
        <Route path="/dang-nhap" element={pub(<Login />)} />
        <Route path="/tai-khoan" element={pub(<Account />)} />
        <Route path="/nhan-quyen/:id" element={pub(<Claim />)} />
        <Route path="/quan-ly" element={<OwnerDashboard />} />
        <Route path="/quan-ly/chinh-sua/:id" element={<OwnerEdit />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/hang-cho" element={<AdminQueue />} />
        <Route path="/admin/ho-so/:id" element={<AdminReview />} />
        <Route path="/admin/dia-diem" element={<AdminPlaces />} />
        <Route path="/admin/xac-minh" element={<AdminClaims />} />
        <Route path="*" element={pub(<div className="container page"><StateBlock kind="empty" title="Không tìm thấy trang" actions={<Link className="btn btn-primary" to="/">Về trang chủ</Link>}>Đường dẫn không tồn tại.</StateBlock></div>)} />
      </Routes>
      {pathname !== '/' && <PreviewTools />}
      <Toasts />
    </>
  );
}
