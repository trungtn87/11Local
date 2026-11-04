import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { PublicShell, Toasts } from './components/layout.jsx';
import { StateBlock } from './components/ui.jsx';
import { Search } from './pages/Public.jsx';
import { DiscoveryHome } from './pages/DiscoveryHome.jsx';
// The landing/search bundle must not import the map engine, account forms,
// submission tools or owner editor. Route chunks load only when visited.
const RealMapExplorer = lazy(() => import('./pages/RealMapExplorer.jsx').then(m => ({ default: m.RealMapExplorer })));
const Login = lazy(() => import('./pages/Auth.jsx').then(m => ({ default: m.Login })));
const Account = lazy(() => import('./pages/Auth.jsx').then(m => ({ default: m.Account })));
const Contribute = lazy(() => import('./pages/Contribute.jsx').then(m => ({ default: m.Contribute })));
const ContributionTracking = lazy(() => import('./pages/Contribute.jsx').then(m => ({ default: m.ContributionTracking })));
const ExistingPlaceFeedback = lazy(() => import('./pages/ExistingPlaceFeedback.jsx').then(m => ({ default: m.ExistingPlaceFeedback })));
const ClaimRequestPage = lazy(() => import('./pages/Ownership.jsx').then(m => ({ default: m.ClaimRequestPage })));
const MyOwnershipPage = lazy(() => import('./pages/Ownership.jsx').then(m => ({ default: m.MyOwnershipPage })));
const ManagedPlacesPage = lazy(() => import('./pages/Ownership.jsx').then(m => ({ default: m.ManagedPlacesPage })));
const OwnerEditor = lazy(() => import('./pages/OwnerEditor.jsx').then(m => ({ default: m.OwnerEditor })));

const publicPage = (page, options) => <PublicShell {...options}>{page}</PublicShell>;

function RouteSkeleton() {
  return <PublicShell><div className="container page local-route-skeleton" role="status" aria-busy="true" aria-label="Đang tải nội dung">
    <div className="skeleton" style={{ height: 26, width: 190, marginBottom: 20 }} />
    <div className="skeleton" style={{ height: 12, maxWidth: 520, marginBottom: 20 }} />
    <div className="place-grid">
      {[0, 1, 2].map(i => <div key={i} className="place-card">
        <div className="skeleton" style={{ aspectRatio: '4/3' }} />
        <div className="pc-body"><div className="skeleton" style={{ height: 14, width: '70%' }} /></div>
      </div>)}
    </div>
  </div></PublicShell>;
}

function NotAvailable({ title }) {
  return <div className="container page">
    <StateBlock title={title} actions={<Link to="/tim-kiem" className="btn btn-primary">Xem địa điểm thật</Link>}>
      Tính năng này chưa kết nối cơ sở dữ liệu và không hiển thị dữ liệu giả lập.
    </StateBlock>
  </div>;
}

// Preserve old bookmarked place URLs while keeping one detail experience.
function LegacyPlaceRedirect() {
  const { slug } = useParams();
  return <Navigate replace to={'/ban-do?place=' + encodeURIComponent(slug || '') + '&detail=1'} />;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <>
    <Suspense fallback={<RouteSkeleton />}>
    <Routes>
      <Route path="/" element={publicPage(<DiscoveryHome />)}/>
      <Route path="/tim-kiem" element={publicPage(<Search />)}/>
      <Route path="/ban-do" element={publicPage(<RealMapExplorer />, { hideFooter: true })}/>
      <Route path="/dia-diem/real/:slug" element={<LegacyPlaceRedirect />}/>
      <Route path="/dia-diem/:slug" element={<LegacyPlaceRedirect />}/>
      <Route path="/dang-nhap" element={publicPage(<Login />)}/>
      <Route path="/tai-khoan" element={publicPage(<Account />)}/>
      <Route path="/dong-gop" element={publicPage(<Contribute />)}/>
      <Route path="/theo-doi" element={publicPage(<ContributionTracking />)}/>
      <Route path="/bao-sai/:id" element={publicPage(<ExistingPlaceFeedback />)}/>
      <Route path="/nhan-quyen/:id" element={publicPage(<ClaimRequestPage />)}/>
      <Route path="/yeu-cau-nhan-quyen" element={publicPage(<MyOwnershipPage />)}/>
      <Route path="/quan-ly/:id" element={publicPage(<OwnerEditor />)}/>
      <Route path="/quan-ly/*" element={publicPage(<ManagedPlacesPage />)}/>
      <Route path="*" element={publicPage(<NotAvailable title="Không tìm thấy trang" />)}/>
    </Routes>
    </Suspense>
    <Toasts />
  </>;
}
