import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, Coffee, BedDouble, Mountain, ShoppingBag, Wrench, SlidersHorizontal, Map as MapIcon, List, Plus, LocateFixed, Lock, RefreshCw, ChevronRight, Sparkles, MapPinOff } from 'lucide-react';
import { useApp } from '../store.jsx';
import { categories, areas, places, byId } from '../data/demo.js';
import { PlaceCard, SearchBar, Button, StateBlock, CardSkeletons, Sheet, PlaceArt, Banner, DemoBadge, Field } from '../components/ui.jsx';
import { MapView } from '../components/MapView.jsx';
import { useResults, distKm } from '../components/hooks.jsx';

const catIcons = { utensils: Utensils, coffee: Coffee, bed: BedDouble, mountain: Mountain, 'shopping-bag': ShoppingBag, wrench: Wrench };

/* ===================== Trang chủ ===================== */
export function Home() {
  const { filters, setFilters, geo, setGeo, toast, hiddenIds } = useApp();
  const nav = useNavigate();
  const visible = places.filter((p) => !hiddenIds.includes(p.id));
  const newest = [...visible].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6);
  const nearby = geo === 'granted' ? [...visible].sort((a, b) => Math.hypot(a.x - 47, a.y - 58) - Math.hypot(b.x - 47, b.y - 58)).slice(0, 4) : [];
  const goCat = (id) => { setFilters((f) => ({ ...f, cat: id, q: '' })); nav('/tim-kiem'); };
  const askGeo = () => { setGeo('granted'); toast('Đã dùng vị trí mô phỏng (không đọc vị trí thật)', 'info'); };
  return (
    <div className="container page stack-lg">
      <section className="hero" aria-labelledby="hero-title">
        <div className="art-bg"><PlaceArt kind="sight" seed={4} label={false} /></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,61,53,.15), rgba(7,61,53,.78))' }} />
        <div className="hero-content">
          <h1 id="hero-title">Khám phá <span className="hl">Cao Bằng</span><br />như người địa phương</h1>
          <p>Quán ăn, cafe, chỗ nghỉ, điểm đến — do cộng đồng đóng góp và Admin kiểm duyệt.</p>
          <SearchBar value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} onSubmit={() => nav('/tim-kiem')} />
        </div>
      </section>

      <section aria-label="Danh mục">
        <div className="cat-grid">
          {categories.map((c) => { const I = catIcons[c.icon]; return c.enabled
            ? <button key={c.id} className="cat-item" onClick={() => goCat(c.id)}><span className="ico"><I size={22} /></span>{c.label}</button>
            : <div key={c.id} className="cat-item disabled" aria-disabled="true" title="Chưa có dữ liệu — chưa mở"><span className="ico"><Lock size={18} /></span>{c.label}<span className="xs muted">Sắp có</span></div>; })}
        </div>
      </section>

      <section aria-label="Gần bạn">
        <div className="section-head"><h2>Gần bạn</h2>{geo === 'granted' && <Link to="/ban-do">Xem bản đồ</Link>}</div>
        {geo === 'granted' ? (
          <div className="hscroll">{nearby.map((p) => <PlaceCard key={p.id} place={p} distance={distKm(p)} />)}</div>
        ) : (
          <div className="card-flat row" style={{ flexWrap: 'wrap' }}>
            <MapPinOff size={22} className="muted" />
            <div className="grow"><b>Xem địa điểm quanh bạn</b><div className="small text-2">Chỉ xin vị trí khi bạn bấm. Nếu từ chối, bạn vẫn chọn được khu vực hoặc ghim thủ công.</div></div>
            <Button size="sm" icon={LocateFixed} onClick={askGeo}>Gần tôi</Button>
            <Button size="sm" variant="outline" onClick={() => { setGeo('denied'); nav('/tim-kiem'); toast('Chọn khu vực để tiếp tục tra cứu', 'info'); }}>Chọn khu vực</Button>
          </div>
        )}
      </section>

      <section aria-label="Địa điểm mới được duyệt">
        <div className="section-head"><h2>Mới được duyệt</h2><Link to="/tim-kiem">Xem tất cả</Link></div>
        <div className="place-grid">{newest.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
        <div style={{ marginTop: 8 }}><DemoBadge>Danh sách demo — không phải địa điểm thật</DemoBadge></div>
      </section>

      <section className="cta-banner" aria-label="Đóng góp địa điểm">
        <span className="ico"><Plus size={26} /></span>
        <div className="grow"><h3>Biết một địa điểm hay?</h3><p className="small text-2">Không cần tài khoản. Gửi địa điểm, nhận mã tra cứu, Admin duyệt rồi mới công khai.</p></div>
        <Link to="/dong-gop" className="btn btn-accent">Đóng góp địa điểm</Link>
      </section>
    </div>
  );
}

/* ===================== Bộ lọc ===================== */
function Filters({ onDone }) {
  const { filters, setFilters, resetFilters, geo, setGeo } = useApp();
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="stack">
      <Field label="Danh mục">
        <div className="row-wrap">
          <button className="chip" aria-pressed={filters.cat === 'all'} onClick={() => set('cat', 'all')}>Tất cả</button>
          {categories.filter((c) => c.enabled).map((c) => <button key={c.id} className="chip" aria-pressed={filters.cat === c.id} onClick={() => set('cat', c.id)}>{c.label}</button>)}
        </div>
      </Field>
      <Field label="Khu vực" htmlFor="f-area">
        <select id="f-area" className="select" value={filters.area} onChange={(e) => set('area', e.target.value)}>
          <option value="all">Toàn Cao Bằng</option>
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
      </Field>
      <label className="check"><input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => set('verifiedOnly', e.target.checked)} /><span>Chỉ địa điểm “Đã xác minh quản lý”<br /><span className="hint">Nhãn này nói về quyền quản lý, không phải điểm chất lượng.</span></span></label>
      <Field label="Sắp xếp" htmlFor="f-sort">
        <select id="f-sort" className="select" value={filters.sort} onChange={(e) => { if (e.target.value === 'nearest' && geo !== 'granted') { setGeo('granted'); } set('sort', e.target.value); }}>
          <option value="relevance">Phù hợp nhất</option>
          <option value="name">Tên A → Z</option>
          <option value="nearest">Gần nhất (cần vị trí)</option>
        </select>
      </Field>
      {filters.sort === 'nearest' && <p className="hint">Khoảng cách là đường thẳng từ vị trí tham chiếu, không phải chiều dài chuyến đi.</p>}
      <div className="row">
        <Button variant="outline" onClick={resetFilters}>Xóa bộ lọc</Button>
        {onDone && <Button onClick={onDone}>Xem kết quả</Button>}
      </div>
    </div>
  );
}

function ResultState({ status, onRetry, resetFilters, q }) {
  const nav = useNavigate();
  if (status === 'loading') return <CardSkeletons />;
  if (status === 'error') return <StateBlock kind="error" title="Không tải được danh sách" actions={<Button icon={RefreshCw} onClick={onRetry}>Thử lại</Button>}>Có lỗi khi lấy dữ liệu. Từ khóa và bộ lọc của bạn vẫn được giữ.</StateBlock>;
  if (status === 'offline') return <StateBlock kind="offline" title="Bạn đang mất mạng" actions={<Button icon={RefreshCw} onClick={onRetry}>Thử lại</Button>}>Kiểm tra kết nối rồi thử lại. Bộ lọc của bạn vẫn được giữ.</StateBlock>;
  return (
    <StateBlock kind="empty" title="Không có kết quả phù hợp" actions={<><Button variant="outline" onClick={resetFilters}>Bỏ bộ lọc</Button><Button variant="accent" onClick={() => nav('/dong-gop')}>Đề xuất thêm địa điểm</Button></>}>
      {q ? <>Không tìm thấy “{q}”. Từ khóa được giữ nguyên để bạn chỉnh lại.</> : 'Thử bỏ bớt bộ lọc hoặc chọn khu vực khác.'}
    </StateBlock>
  );
}

/* ===================== Tìm kiếm + danh sách + bản đồ ===================== */
export function Search() {
  const { filters, setFilters, resetFilters, setForced, geo } = useApp();
  const { status, list } = useResults();
  const [view, setView] = useState('list');
  const [sheet, setSheet] = useState(false);
  const [sel, setSel] = useState(null);
  const nav = useNavigate();
  const activeCount = (filters.cat !== 'all') + (filters.area !== 'all') + filters.verifiedOnly;
  const retry = () => setForced('none');
  const withMap = view === 'map';
  const showDist = filters.sort === 'nearest' && geo === 'granted';

  return (
    <div className="container page stack">
      <div className="hide-desktop"><SearchBar compact value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} /></div>
      <div className="row between" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1>{filters.cat === 'all' ? 'Địa điểm ở Cao Bằng' : categories.find((c) => c.id === filters.cat)?.label}</h1>
          <p className="small muted" aria-live="polite">{status === 'ok' ? `${list.length} kết quả` : status === 'loading' ? 'Đang tải…' : ''}{filters.q && status === 'ok' ? ` cho “${filters.q}”` : ''}</p>
        </div>
        <div className="row">
          <Button variant="outline" size="sm" icon={SlidersHorizontal} className="hide-desktop" onClick={() => setSheet(true)}>Bộ lọc{activeCount ? ` (${activeCount})` : ''}</Button>
          <div className="seg" role="group" aria-label="Chế độ xem">
            <button aria-pressed={!withMap} onClick={() => setView('list')}><List size={16} />Danh sách</button>
            <button aria-pressed={withMap} onClick={() => { if (window.innerWidth < 960) nav('/ban-do'); else setView('map'); }}><MapIcon size={16} />Bản đồ</button>
          </div>
        </div>
      </div>

      <div className={`results-layout ${withMap ? 'with-map' : ''}`}>
        <aside className="filters card hide-mobile" aria-label="Bộ lọc"><h3 className="card-title">Bộ lọc</h3><Filters /></aside>
        <div className="stack">
          {status === 'ok' ? (
            <div className={withMap ? 'stack-sm' : 'place-grid'} style={withMap ? undefined : undefined}>
              {list.map((p) => <PlaceCard key={p.id} place={p} horizontal={withMap} distance={showDist ? distKm(p) : undefined} />)}
            </div>
          ) : <ResultState status={status} onRetry={retry} resetFilters={resetFilters} q={filters.q} />}
        </div>
        {withMap && (
          status === 'error' || status === 'offline'
            ? <div className="card"><StateBlock kind="error" title="Bản đồ chưa tải được">Danh sách bên cạnh vẫn dùng được bình thường.</StateBlock></div>
            : <MapView places={list} selectedId={sel} onSelect={setSel} className="sticky" height={620} />
        )}
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Bộ lọc"><Filters onDone={() => setSheet(false)} /></Sheet>
    </div>
  );
}

/* ===================== Bản đồ khám phá (mobile full) ===================== */
export function MapPage() {
  const { filters, setFilters, resetFilters, setForced, geo, setGeo, toast } = useApp();
  const { status, list } = useResults();
  const [sel, setSel] = useState(null);
  const [sheet, setSheet] = useState(false);
  const nav = useNavigate();
  const activeCount = (filters.cat !== 'all') + (filters.area !== 'all') + filters.verifiedOnly;
  return (
    <div className="map-page">
      <div className="container" style={{ padding: '10px var(--s-4)' }}>
        <div className="row">
          <div className="grow"><SearchBar compact value={filters.q} onChange={(q) => setFilters((f) => ({ ...f, q }))} /></div>
          <Button variant="outline" size="sm" icon={SlidersHorizontal} onClick={() => setSheet(true)}>Lọc{activeCount ? ` (${activeCount})` : ''}</Button>
        </div>
        <div className="chip-scroll" style={{ marginTop: 8, paddingBottom: 0 }}>
          <button className="chip" aria-pressed={filters.cat === 'all'} onClick={() => setFilters((f) => ({ ...f, cat: 'all' }))}>Tất cả</button>
          {categories.filter((c) => c.enabled).map((c) => <button key={c.id} className="chip" aria-pressed={filters.cat === c.id} onClick={() => setFilters((f) => ({ ...f, cat: c.id }))}>{c.label}</button>)}
        </div>
      </div>
      {status === 'error' || status === 'offline' ? (
        <div className="container grow"><StateBlock kind="error" title="Bản đồ chưa tải được" actions={<><Button onClick={() => setForced('none')} icon={RefreshCw}>Thử lại</Button><Button variant="outline" onClick={() => nav('/tim-kiem')}>Xem dạng danh sách</Button></>}>Danh sách vẫn dùng được. Bộ lọc của bạn được giữ nguyên.</StateBlock></div>
      ) : status === 'loading' ? (
        <div className="map-wrap full skeleton" aria-busy="true" aria-label="Đang tải bản đồ" />
      ) : status === 'empty' ? (
        <div className="container grow"><StateBlock kind="empty" title="Không có địa điểm trong vùng này" actions={<Button variant="outline" onClick={resetFilters}>Bỏ bộ lọc</Button>}>Hãy thử bỏ bộ lọc hoặc đề xuất thêm địa điểm mới.</StateBlock></div>
      ) : (
        <MapView full onLocate={() => { setGeo('granted'); toast('Đã dùng vị trí mô phỏng', 'info'); }} places={list} selectedId={sel} onSelect={setSel} showMe={geo === 'granted'} onSearchArea={() => toast(`Tìm trong vùng: ${list.length} địa điểm`, 'info')} />
      )}
      <div style={{ position: 'absolute' }} />
            {geo === 'denied' && <div className="container" style={{ position: 'absolute', left: 0, right: 0 }}><Banner type="warning">Bạn đã từ chối vị trí. Hãy chọn khu vực hoặc ghim vị trí thủ công.</Banner></div>}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Bộ lọc"><Filters onDone={() => setSheet(false)} /></Sheet>
    </div>
  );
}
