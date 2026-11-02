import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Search, X, BadgeCheck, Heart, ImageOff, WifiOff, TriangleAlert, Lock, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { statusLabel, opLabel, catLabel } from '../data/demo.js';

/* ---------- Logo ---------- */
export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="11Local — Trang chủ">
      <svg className="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0f5f52" />
        <path d="M3 24 L11 12 L16 19 L21 10 L29 24 Z" fill="#1d9684" />
        <path d="M3 24 L11 12 L16 19 L10 24Z" fill="#14796a" />
        <circle cx="24" cy="9" r="3" fill="#d9822b" />
      </svg>
      <span>11<em>Local</em></span>
    </Link>
  );
}

/* ---------- Illustrated place art (generated, NOT a real photo) ---------- */
function rng(seed) {
  let a = seed * 2654435761 >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const PAL = {
  food:  { sky: ['#fbe3b8', '#f3b266'], m: ['#8a5a2b', '#6e4421', '#4f2f16'], acc: '#c8742b' },
  cafe:  { sky: ['#dfe9e4', '#b6cfc6'], m: ['#6f9a8c', '#4c7a6c', '#2f5a4d'], acc: '#ffffff' },
  stay:  { sky: ['#cfe6f2', '#9ccbe0'], m: ['#4f8c78', '#2f6b5a', '#174d41'], acc: '#b9661a' },
  sight: { sky: ['#fde7c8', '#f6a56b'], m: ['#6c7f8d', '#445a69', '#27394a'], acc: '#fff3cf' },
  water: { sky: ['#d8f0f0', '#9fd8d6'], m: ['#4a8f87', '#2f6f69', '#17504b'], acc: '#ffffff' },
  shop:  { sky: ['#fce1d2', '#f4b79a'], m: ['#a56a4b', '#80482f', '#5b2f1c'], acc: '#2b3a6b' },
  def:   { sky: ['#e6efe9', '#c3d9cf'], m: ['#8fb3a5', '#6a9585', '#4a7565'], acc: '#ffffff' },
};
export function PlaceArt({ kind = 'def', seed = 1, label = true, className = '' }) {
  const p = PAL[kind] || PAL.def;
  const id = `g${kind}${seed}${Math.random().toString(36).slice(2, 6)}`;
  const layers = useMemo(() => {
    const r = rng(seed + 1);
    return [0, 1, 2].map((i) => {
      const base = 150 + i * 42; const pts = [`0,300`, `0,${base}`];
      let x = 0;
      while (x < 400) { x += 40 + r() * 50; const h = base - 30 - r() * (70 - i * 14); pts.push(`${Math.min(x - 20, 400)},${h}`, `${Math.min(x, 400)},${base + r() * 8}`); }
      pts.push('400,300');
      return pts.join(' ');
    });
  }, [seed]);
  return (
    <div className={`art-wrap ${className}`} style={{ width: '100%', height: '100%' }}>
      <svg className="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} /></linearGradient></defs>
        <rect width="400" height="300" fill={`url(#${id})`} />
        <circle cx={90 + (seed % 5) * 55} cy="70" r="26" fill={p.acc} opacity=".7" />
        {layers.map((pts, i) => <polygon key={i} points={pts} fill={p.m[i]} />)}
        {kind === 'water' && [0, 1, 2, 3].map((i) => <rect key={i} x={170 + i * 14} y="120" width="6" height="180" rx="3" fill="#fff" opacity={0.85 - i * 0.12} />)}
        {kind === 'stay' && <g fill={p.acc}><rect x="180" y="205" width="60" height="30" /><polygon points="172,205 210,178 248,205" fill="#7a3d0d" /><rect x="190" y="235" width="4" height="25" /><rect x="226" y="235" width="4" height="25" /></g>}
        {kind === 'food' && [0, 1, 2, 3].map((i) => <path key={i} d={`M0 ${250 + i * 12} Q100 ${236 + i * 12} 200 ${250 + i * 12} T400 ${250 + i * 12}`} stroke="#f0c36b" strokeWidth="5" fill="none" opacity=".7" />)}
        {kind === 'cafe' && [0, 1].map((i) => <ellipse key={i} cx={120 + i * 150} cy={200 + i * 16} rx="130" ry="10" fill="#fff" opacity=".45" />)}
        {kind === 'shop' && [0, 1, 2, 3, 4].map((i) => <rect key={i} x={40 + i * 66} y="225" width="56" height="22" rx="4" fill={['#d9822b', '#2b3a6b', '#1d9684', '#b3261e', '#e0a100'][i]} opacity=".9" />)}
      </svg>
      {label && <span className="art-label">Ảnh minh họa</span>}
    </div>
  );
}

/* ---------- Badges ---------- */
export function StatusBadge({ status }) {
  const [t, v] = statusLabel[status] || [status, 'neutral'];
  return <span className={`badge badge-${v}`}>{t}</span>;
}
export function OpBadge({ op }) {
  const [t, v] = opLabel[op] || opLabel.unknown;
  return <span className={`badge badge-${v}`}>{t}</span>;
}
export function ManageBadge({ managed }) {
  return managed
    ? <span className="badge badge-verified"><BadgeCheck size={13} /> Đã xác minh quản lý</span>
    : <span className="badge badge-neutral">Chưa xác minh quản lý</span>;
}
export const DemoBadge = ({ children = 'DEMO' }) => <span className="badge badge-demo">{children}</span>;

/* ---------- Rating ---------- */
export function Rating({ rating, compact }) {
  if (!rating) return <span className="rating none">Chưa có đánh giá</span>;
  return <span className="rating"><Star size={14} /> {rating.avg.toFixed(1)}{!compact && <span className="muted" style={{ fontWeight: 400 }}>({rating.count})</span>}</span>;
}

/* ---------- Place card ---------- */
export function PlaceCard({ place, horizontal, distance }) {
  const { favs, toggleFav } = useAppLite();
  const fav = favs.includes(place.id);
  return (
    <Link to={`/dia-diem/${place.id}`} className={`place-card ${horizontal ? 'horizontal' : ''}`}>
      <div className="pc-img">
        {place.photos.official + place.photos.community > 0
          ? <PlaceArt kind={place.art.kind} seed={place.art.seed} label={false} />
          : <DefaultImage />}
        {place.op !== 'active' && place.op !== 'unknown' && <div className="pc-tags"><OpBadge op={place.op} /></div>}
        {!horizontal && (
          <button className="pc-fav" aria-label={fav ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'} onClick={(e) => { e.preventDefault(); toggleFav(place.id); }}>
            <Heart size={18} fill={fav ? '#b3261e' : 'none'} color={fav ? '#b3261e' : '#1d2623'} />
          </button>
        )}
      </div>
      <div className="pc-body">
        <span className="pc-name">{place.name}</span>
        <span className="pc-meta">{catLabel(place.cat)} · {place.area}</span>
        <div className="row between" style={{ marginTop: 2 }}>
          <Rating rating={place.rating} />
          {distance && <span className="xs muted">~{distance} km · đường thẳng</span>}
        </div>
        {place.managed && <span style={{ marginTop: 2 }}><ManageBadge managed /></span>}
      </div>
    </Link>
  );
}
import { useApp } from '../store.jsx';
const useAppLite = () => useApp();

export function DefaultImage() {
  return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}><div className="center"><ImageOff size={28} /><div className="xs">Chưa có ảnh</div></div></div>;
}

/* ---------- Buttons ---------- */
export function Button({ variant = 'primary', size, block, loading, icon: Icon, children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${block ? 'btn-block' : ''} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" aria-hidden /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} /> : null}
      {children}
    </button>
  );
}

/* ---------- Search ---------- */
export function SearchBar({ value, onChange, onSubmit, placeholder = 'Bạn muốn tìm gì ở Cao Bằng?', compact, autoFocus }) {
  return (
    <form className={`searchbar ${compact ? 'compact' : ''}`} role="search" onSubmit={(e) => { e.preventDefault(); onSubmit?.(value); }}>
      <Search size={18} aria-hidden />
      <input aria-label="Tìm kiếm địa điểm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} enterKeyHint="search" />
      {value && <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ width: 34, minHeight: 34 }} aria-label="Xóa từ khóa" onClick={() => onChange('')}><X size={16} /></button>}
      {!compact && <button type="submit" className="btn btn-primary btn-sm">Tìm</button>}
    </form>
  );
}

/* ---------- Field ---------- */
export function Field({ label, required, hint, error, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}{required && <span className="req" aria-hidden>*</span>}</label>}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err-text" role="alert"><TriangleAlert size={13} /> {error}</span>}
    </div>
  );
}

/* ---------- Banner ---------- */
const bIcon = { info: Info, warning: TriangleAlert, danger: TriangleAlert, success: CheckCircle2, demo: Info };
export function Banner({ type = 'info', children, title }) {
  const I = bIcon[type];
  return <div className={`banner banner-${type}`} role={type === 'danger' ? 'alert' : 'note'}><I size={18} /><div>{title && <b>{title} </b>}{children}</div></div>;
}

/* ---------- States ---------- */
export function StateBlock({ kind = 'empty', title, children, actions }) {
  const icon = { empty: <Search size={28} />, error: <TriangleAlert size={28} />, offline: <WifiOff size={28} />, restricted: <Lock size={28} /> }[kind];
  return (
    <div className={`state ${kind === 'error' || kind === 'offline' ? 'error' : kind === 'restricted' ? 'restricted' : ''}`} role={kind === 'error' ? 'alert' : undefined}>
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {actions && <div className="row-wrap" style={{ justifyContent: 'center' }}>{actions}</div>}
    </div>
  );
}
export function CardSkeletons({ n = 6 }) {
  return (
    <div className="place-grid" aria-busy="true" aria-label="Đang tải danh sách">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="place-card"><div className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 0 }} />
          <div className="pc-body"><div className="skeleton" style={{ height: 16, width: '80%' }} /><div className="skeleton" style={{ height: 12, width: '55%' }} /><div className="skeleton" style={{ height: 12, width: '35%' }} /></div></div>
      ))}
    </div>
  );
}

/* ---------- Overlays ---------- */
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        <div className="sheet-head"><h3>{title}</h3><button className="btn btn-ghost btn-icon" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, title, children, confirmLabel = 'Xác nhận', danger, onConfirm, loading }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="stack">
        <div className="text-2">{children}</div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Sheet>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  const I = { success: CheckCircle2, error: TriangleAlert, info: Info };
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => { const Ic = I[t.type] || Info; return <div key={t.id} className={`toast ${t.type}`}><Ic size={18} />{t.msg}</div>; })}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>{t.label}</button>)}
    </div>
  );
}

export function Steps({ total, current }) {
  return <div className="steps" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} aria-label={`Bước ${current}/${total}`}>{Array.from({ length: total }, (_, i) => <i key={i} className={i < current ? 'done' : ''} />)}</div>;
}

export function Spinner() { return <Loader2 className="spinner" style={{ border: 0, animation: 'spin .8s linear infinite' }} />; }
export { MapPin };
