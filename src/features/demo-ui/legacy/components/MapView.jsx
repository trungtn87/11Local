import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, LocateFixed, Utensils, Coffee, BedDouble, Mountain, ShoppingBag, MapPin, Navigation, X } from 'lucide-react';
import { Button, PlaceArt, Rating, ManageBadge } from './ui.jsx';
import { catLabel } from '../data/demo.js';

const catIcon = { food: Utensils, cafe: Coffee, stay: BedDouble, sight: Mountain, shop: ShoppingBag };

/** Bản đồ GIẢ LẬP — chỉ để thử bố cục (ghim, gộp ghim, thẻ địa điểm, tìm trong vùng).
 *  Chưa dùng nhà cung cấp bản đồ thật; vị trí x,y là phần trăm trên khung, không phải tọa độ. */
export function MapView({ places, selectedId, onSelect, full, showMe, onSearchArea, onLocate, className = '', height }) {
  const [zoom, setZoom] = useState(0);
  const [dirty, setDirty] = useState(false);

  const items = useMemo(() => {
    if (zoom > 0) return places.map((p) => ({ type: 'pin', p }));
    const used = new Set(); const out = [];
    places.forEach((a) => {
      if (used.has(a.id)) return;
      const group = places.filter((b) => !used.has(b.id) && Math.hypot(a.x - b.x, a.y - b.y) < 8);
      group.forEach((g) => used.add(g.id));
      if (group.length > 1) out.push({ type: 'cluster', n: group.length, x: group.reduce((s, g) => s + g.x, 0) / group.length, y: group.reduce((s, g) => s + g.y, 0) / group.length, ids: group.map((g) => g.id) });
      else out.push({ type: 'pin', p: a });
    });
    return out;
  }, [places, zoom]);

  const sel = places.find((p) => p.id === selectedId);
  const scale = zoom ? 1.25 : 1;

  return (
    <div className={`map-wrap ${full ? 'full' : ''} ${className}`} style={{ height }} role="application" aria-label="Bản đồ giả lập các địa điểm">
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform .25s' }}>
        <svg className="terrain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="100" fill="#e9efe3" />
          <path d="M0 78 Q20 70 36 76 T70 72 T100 80 V100 H0Z" fill="#dfe8d6" />
          <path d="M-5 30 Q25 18 40 34 T75 30 T105 18" stroke="#9fd0e0" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M-5 30 Q25 18 40 34 T75 30 T105 18" stroke="#c7e7f1" strokeWidth="1.5" fill="none" />
          {[[18, 22, 12], [74, 52, 14], [30, 80, 10], [88, 70, 9], [8, 50, 8], [58, 12, 9]].map(([x, y, r], i) => (
            <g key={i}><ellipse cx={x} cy={y} rx={r} ry={r * .8} fill="#cfdcc3" /><ellipse cx={x} cy={y} rx={r * .55} ry={r * .45} fill="#b9cba9" /></g>
          ))}
          <path d="M5 62 L30 58 L48 52 L66 60 L95 48" stroke="#fff" strokeWidth="1.4" fill="none" />
          <path d="M48 52 L52 30 L60 8" stroke="#fff" strokeWidth="1" fill="none" />
          <g fontSize="2.8" fill="#6a7a70" fontFamily="inherit"><text x="40" y="60">TP. Cao Bằng</text><text x="68" y="24">Trùng Khánh</text><text x="14" y="58">Nguyên Bình</text><text x="30" y="36">Hòa An</text></g>
        </svg>
      </div>

      {showMe && <div className="me-dot" style={{ left: '47%', top: '58%' }} aria-label="Vị trí tham chiếu của bạn (mô phỏng)" />}

      {items.map((it, i) => it.type === 'cluster'
        ? <button key={'c' + i} className="cluster" style={{ left: `${it.x}%`, top: `${it.y}%` }} aria-label={`${it.n} địa điểm gần nhau — phóng to`} onClick={() => { setZoom(1); setDirty(true); }}>{it.n}</button>
        : (() => { const I = catIcon[it.p.cat] || MapPin; return (
          <button key={it.p.id} className={`pin ${selectedId === it.p.id ? 'selected' : ''}`} style={{ left: `${it.p.x}%`, top: `${it.p.y}%` }} aria-label={`${it.p.name}, ${catLabel(it.p.cat)}`} onClick={() => onSelect?.(it.p.id)}>
            <span className="pin-body"><I size={selectedId === it.p.id ? 20 : 16} /></span>
          </button>); })())}

      <div className="map-top">
        {dirty && <Button size="sm" variant="primary" onClick={() => { setDirty(false); onSearchArea?.(); }}>Tìm trong vùng này</Button>}
      </div>
      <div className="map-ctrl">
        <Button variant="outline" className="btn-icon" aria-label="Phóng to" onClick={() => { setZoom(1); setDirty(true); }}><Plus size={18} /></Button>
        {onLocate && <Button variant="primary" className="btn-icon" aria-label="Gần tôi" onClick={onLocate}><LocateFixed size={18} /></Button>}
        <Button variant="outline" className="btn-icon" aria-label="Thu nhỏ" onClick={() => { setZoom(0); setDirty(true); }}><Minus size={18} /></Button>
      </div>

      {sel && (
        <div className="map-sheet">
          <div className="card" style={{ padding: 0, boxShadow: 'var(--sh-3)', overflow: 'hidden' }}>
            <div className="row" style={{ alignItems: 'stretch', gap: 0 }}>
              <div style={{ width: 96, flex: 'none' }}><PlaceArt kind={sel.art.kind} seed={sel.art.seed} label={false} /></div>
              <div className="grow stack-sm" style={{ padding: 12 }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <Link to={`/dia-diem/${sel.id}`} style={{ fontWeight: 700, color: 'var(--c-text)' }}>{sel.name}</Link>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ width: 28, minHeight: 28 }} aria-label="Đóng thẻ" onClick={() => onSelect?.(null)}><X size={16} /></button>
                </div>
                <span className="small muted">{catLabel(sel.cat)} · {sel.area}</span>
                <div className="row between"><Rating rating={sel.rating} />{sel.managed && <ManageBadge managed />}</div>
                <div className="row"><Link to={`/dia-diem/${sel.id}`} className="btn btn-primary btn-sm">Xem chi tiết</Link><button className="btn btn-outline btn-sm"><Navigation size={14} /> Chỉ đường</button></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <span className="map-badge">Bản đồ giả lập — chưa kết nối bản đồ thật</span>
    </div>
  );
}

export function PinPicker({ value, onChange }) {
  return (
    <div className="map-wrap pin-picker" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onChange({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) }); }} role="button" tabIndex={0} aria-label="Chạm để đặt ghim vị trí" onKeyDown={(e) => e.key === 'Enter' && onChange({ x: 50, y: 50 })} style={{ cursor: 'crosshair' }}>
      <svg className="terrain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><rect width="100" height="100" fill="#e9efe3" /><path d="M-5 40 Q25 25 45 45 T105 30" stroke="#9fd0e0" strokeWidth="5" fill="none" /><path d="M0 70 L50 60 L100 72" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>
      {value && <div className="pin selected" style={{ left: `${value.x}%`, top: `${value.y}%` }}><span className="pin-body"><MapPin size={18} /></span></div>}
      {!value && <div className="center small muted" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>Chạm vào bản đồ để đặt ghim</div>}
      <span className="map-badge">Bản đồ giả lập</span>
    </div>
  );
}
