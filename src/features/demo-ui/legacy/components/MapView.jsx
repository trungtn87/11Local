import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, LocateFixed, MapPin, Navigation, X } from 'lucide-react';
import { MapCanvas } from '../../../map/map-canvas';
import { Button, PlaceArt, Rating, ManageBadge } from './ui.jsx';
import { catLabel } from '../data/demo.js';

/** Bản đồ thật (MapLibre + OpenFreeMap, đã loại POI mặc định). Chưa có ghim địa điểm 11Local —
 *  ghim/cụm sẽ đến từ database ở MAP-02; x,y của dữ liệu demo không phải tọa độ nên không vẽ. */
export function MapView({ places, selectedId, onSelect, full, onSearchArea, onLocate, className = '', height }) {
  const [dirty, setDirty] = useState(false);
  const mapRef = useRef(null);
  const sel = places.find((p) => p.id === selectedId);

  return (
    <div className={`map-wrap ${full ? 'full' : ''} ${className}`} style={{ height }}>
      <MapCanvas embedded onReady={(m) => { mapRef.current = m; }} onMoveEnd={() => setDirty(true)} />

      <div className="map-top">
        {dirty && <Button size="sm" variant="primary" onClick={() => { setDirty(false); onSearchArea?.(); }}>Tìm trong vùng này</Button>}
      </div>
      <div className="map-ctrl">
        <Button variant="outline" className="btn-icon" aria-label="Phóng to" onClick={() => mapRef.current?.zoomIn()}><Plus size={18} /></Button>
        {onLocate && <Button variant="primary" className="btn-icon" aria-label="Gần tôi" onClick={onLocate}><LocateFixed size={18} /></Button>}
        <Button variant="outline" className="btn-icon" aria-label="Thu nhỏ" onClick={() => mapRef.current?.zoomOut()}><Minus size={18} /></Button>
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
      <span className="map-badge">Chưa hiển thị địa điểm 11Local trên bản đồ</span>
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
