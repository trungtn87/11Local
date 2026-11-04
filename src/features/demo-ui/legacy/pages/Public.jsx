import { lazy, Suspense, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocateFixed, List, Map as MapIcon, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../store.jsx';
import { Button, CardSkeletons, Field, Sheet, StateBlock } from '../components/ui.jsx';
import { RealPlaceCard } from './DiscoveryHome.jsx';
import { PlaceDetailPanel } from '../components/PlaceDetailPanel.jsx';
// Only load map engine if an inline map is actually requested.
const MapView = lazy(() => import('../components/MapView.jsx').then(m => ({ default: m.MapView })));
import { useResults } from '../components/hooks.jsx';
import { distanceProvider } from '../../../distance/distance-service';

function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Trình duyệt không hỗ trợ GPS.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}

function Filters({ areas, close }) {
  const { filters, setFilters, categories, geoPosition, setGeoPosition, setGeo, toast } = useApp();
  const set = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  const locate = async () => {
    try {
      const coords = await requestLocation();
      setGeoPosition(coords); setGeo('granted');
      toast('Đã lấy vị trí thật. Khoảng cách được tính theo đường thẳng.', 'success');
    } catch (error) {
      setGeo(error?.code === 1 ? 'denied' : 'off');
      toast(error?.code === 1 ? 'Hãy cấp quyền vị trí cho trình duyệt.' : 'Không lấy được vị trí hiện tại.', 'error');
    }
  };

  return (
    <div className="stack">
      <Field label="Danh mục"><div className="row-wrap">
        <button className="chip" aria-pressed={filters.cat === 'all'} onClick={() => set('cat', 'all')}>Tất cả</button>
        {categories.filter((category) => category.enabled).map((category) => (
          <button key={category.id} className="chip" aria-pressed={filters.cat === category.id} onClick={() => set('cat', category.id)}>{category.label}</button>
        ))}
      </div></Field>
      <Field label="Khu vực" htmlFor="search-area"><select className="select" id="search-area" value={filters.area} onChange={(event) => set('area', event.target.value)}>
        <option value="all">Toàn Cao Bằng</option>
        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
      </select></Field>
      <label className="check"><input type="checkbox" checked={filters.verifiedOnly} onChange={(event) => set('verifiedOnly', event.target.checked)} /><span>Chỉ địa điểm đã xác minh chủ quản lý</span></label>
      <Field label="Sắp xếp" htmlFor="search-sort"><select className="select" id="search-sort" value={filters.sort} onChange={(event) => set('sort', event.target.value)}>
        <option value="relevance">Mới cập nhật / phù hợp</option>
        <option value="name">Tên A → Z</option>
        <option value="nearest">Gần nhất (theo GPS)</option>
      </select></Field>
      {filters.sort === 'nearest' && !geoPosition && <div className="stack-sm">
        <p className="small muted">Cần vị trí thật để sắp xếp theo khoảng cách. Không dùng tọa độ giả.</p>
        <Button icon={LocateFixed} size="sm" onClick={locate}>Lấy vị trí của tôi</Button>
      </div>}
      {filters.sort === 'nearest' && geoPosition && <p className="small muted">Sắp xếp theo khoảng cách đường thẳng ước tính từ GPS.</p>}
      <div className="row-wrap">
        <Button variant="outline" onClick={() => setFilters({ q: '', cat: 'all', area: 'all', verifiedOnly: false, openNowOnly: false, sort: 'relevance' })}>Xóa bộ lọc</Button>
        {close && <Button onClick={close}>Xem kết quả</Button>}
      </div>
    </div>
  );
}

function Results({ results, position, horizontal, retry, clear, onDetails }) {
  if (results.status === 'loading') return <CardSkeletons n={4} />;
  if (results.status === 'error') return <StateBlock kind="error" title="Không tải được dữ liệu Neon" actions={<Button icon={RefreshCw} onClick={retry}>Thử lại</Button>}>Địa điểm thật tạm thời không khả dụng; hệ thống không thay bằng địa điểm mẫu.</StateBlock>;
  if (results.status === 'empty') return <StateBlock title="Không tìm thấy địa điểm phù hợp" actions={<Button variant="outline" onClick={clear}>Xóa bộ lọc</Button>}>Chỉ các địa điểm đã được Admin công khai mới xuất hiện.</StateBlock>;
  return <div className={horizontal ? 'stack-sm' : 'place-grid'}>{results.list.map((place) => (
    <RealPlaceCard key={place.id} place={place} onDetails={onDetails} distance={position ? distanceProvider.calculate(position, place) : undefined} />
  ))}</div>;
}

export function Search() {
  const { filters, categories, geoPosition, resetFilters } = useApp();
  const results = useResults();
  const [view, setView] = useState('list');
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailPlace, setDetailPlace] = useState(null);
  const onCloseDetail = useCallback(() => setDetailPlace(null), []);
  const navigate = useNavigate();
  const active = Number(filters.cat !== 'all') + Number(filters.area !== 'all') + Number(filters.verifiedOnly);
  const withMap = view === 'map';
  return <div className="container page stack">
    <div className="row between" style={{ flexWrap: 'wrap' }}>
      <div>
        <h1>{filters.cat === 'all' ? 'Địa điểm ở Cao Bằng' : categories.find((item) => item.id === filters.cat)?.label || 'Địa điểm'}</h1>
        <p className="small muted" aria-live="polite">{results.status === 'loading' ? 'Đang tải…' : results.status === 'error' ? 'Lỗi tải dữ liệu' : results.list.length + ' địa điểm thật'}{filters.q ? ' cho “' + filters.q + '”' : ''}</p>
      </div>
      <div className="row">
        <Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={() => setSheet(true)}>Bộ lọc{active ? ' (' + active + ')' : ''}</Button>
        <div className="seg" role="group" aria-label="Chế độ xem">
          <button aria-pressed={!withMap} onClick={() => setView('list')}><List size={16} />Danh sách</button>
          <button aria-pressed={withMap} onClick={() => navigate('/ban-do')}><MapIcon size={16} />Bản đồ</button>
        </div>
      </div>
    </div>
    <div className={'results-layout ' + (withMap ? 'with-map' : '')}>
      <aside className="filters card hide-mobile"><h3 className="card-title">Bộ lọc</h3><Filters areas={results.areas}/></aside>
      <Results results={results} position={geoPosition} horizontal={withMap} retry={results.retry} clear={resetFilters} onDetails={setDetailPlace}/>
      {withMap && results.status !== 'error' && <Suspense fallback={<div className="map-wrap skeleton" style={{ height: 620 }} role="status" aria-label="Đang tải bản đồ" />}>
        <MapView places={results.list} selectedId={selected} onSelect={setSelected} height={620} className="sticky" />
      </Suspense>}
    </div>
    <Sheet open={sheet} title="Bộ lọc" onClose={() => setSheet(false)}><Filters areas={results.areas} close={() => setSheet(false)}/></Sheet>
    {detailPlace && <PlaceDetailPanel key={detailPlace.slug} place={detailPlace} mode="page" onClose={onCloseDetail} />}
  </div>;
}

export function MapPage() {
  const { filters, setFilters, categories, geoPosition, setGeoPosition, setGeo, toast, resetFilters } = useApp();
  const results = useResults();
  const [selected, setSelected] = useState(null);
  const [sheet, setSheet] = useState(false);
  const locate = async () => {
    try {
      const coords = await requestLocation();
      setGeoPosition(coords);setGeo('granted');toast('Đã lấy vị trí hiện tại.', 'success');
    } catch (error) {
      setGeo(error?.code === 1 ? 'denied' : 'off');
      toast('Không lấy được vị trí hiện tại. Hãy kiểm tra quyền GPS.', 'error');
    }
  };
  return <div className="map-page">
    <div className="container" style={{ paddingTop: 10, paddingBottom: 10 }}>
      <div className="row between"><b>Bản đồ địa điểm thật</b><Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={() => setSheet(true)}>Bộ lọc</Button></div>
      <div className="chip-scroll" style={{ marginTop: 8, paddingBottom: 0 }}>
        <button className="chip" aria-pressed={filters.cat === 'all'} onClick={() => setFilters((value) => ({ ...value, cat: 'all' }))}>Tất cả</button>
        {categories.filter((category) => category.enabled).map((category) => <button key={category.id} className="chip" aria-pressed={filters.cat === category.id} onClick={() => setFilters((value) => ({ ...value, cat: category.id }))}>{category.label}</button>)}
      </div>
      <p className="xs muted" aria-live="polite">{results.status === 'error' ? 'Không tải được dữ liệu Neon' : results.status === 'loading' ? 'Đang tải địa điểm…' : results.list.length + ' địa điểm đã công khai'}</p>
    </div>
    {results.status === 'error'
      ? <div className="container grow"><StateBlock kind="error" title="Không thể lấy địa điểm" actions={<Button onClick={results.retry}>Thử lại</Button>}>Không hiển thị ghim giả lập.</StateBlock></div>
      : results.status === 'loading'
        ? <div className="map-wrap full skeleton" aria-busy="true" aria-label="Đang tải bản đồ"/>
        : <MapView full places={results.list} selectedId={selected} onSelect={setSelected} currentLocation={geoPosition} onLocate={locate}/>}
    {results.status === 'empty' && <div className="container" style={{ position: 'relative', zIndex: 2 }}><p className="small muted">Không có địa điểm phù hợp. <button className="chip" onClick={resetFilters}>Xóa bộ lọc</button></p></div>}
    <Sheet open={sheet} title="Bộ lọc" onClose={() => setSheet(false)}><Filters areas={results.areas} close={() => setSheet(false)}/></Sheet>
  </div>;
}
