import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { PublicShell, Toasts } from './components/layout.jsx';
import { StateBlock } from './components/ui.jsx';
import { Search } from './pages/Public.jsx';
import { RealMapExplorer } from './pages/RealMapExplorer.jsx';
import { DiscoveryHome } from './pages/DiscoveryHome.jsx';
import { RealPlaceDetail } from './pages/RealPlaceDetail.jsx';
import { Login, Account } from './pages/Auth.jsx';
import { Contribute, ContributionTracking } from './pages/Contribute.jsx';

const publicPage = (page, options) => <PublicShell {...options}>{page}</PublicShell>;

function NotAvailable({ title }) {
  return <div className="container page">
    <StateBlock title={title} actions={<Link to="/tim-kiem" className="btn btn-primary">Xem địa điểm thật</Link>}>
      Tính năng này chưa kết nối cơ sở dữ liệu và không hiển thị dữ liệu giả lập.
    </StateBlock>
  </div>;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <>
    <Routes>
      <Route path="/" element={publicPage(<DiscoveryHome />)}/>
      <Route path="/tim-kiem" element={publicPage(<Search />)}/>
      <Route path="/ban-do" element={publicPage(<RealMapExplorer />, { hideFooter: true })}/>
      <Route path="/dia-diem/real/:slug" element={publicPage(<RealPlaceDetail />)}/>
      <Route path="/dia-diem/:slug" element={publicPage(<RealPlaceDetail />)}/>
      <Route path="/dang-nhap" element={publicPage(<Login />)}/>
      <Route path="/tai-khoan" element={publicPage(<Account />)}/>
      <Route path="/dong-gop" element={publicPage(<Contribute />)}/>
      <Route path="/theo-doi" element={publicPage(<ContributionTracking />)}/>
      <Route path="/bao-sai/:id" element={publicPage(<NotAvailable title="Báo sai đang hoàn thiện" />)}/>
      <Route path="/nhan-quyen/:id" element={publicPage(<NotAvailable title="Nhận quyền quản lý đang hoàn thiện" />)}/>
      <Route path="/quan-ly/*" element={publicPage(<NotAvailable title="Quản lý địa điểm đang hoàn thiện" />)}/>
      <Route path="*" element={publicPage(<NotAvailable title="Không tìm thấy trang" />)}/>
    </Routes>
    <Toasts />
  </>;
}
