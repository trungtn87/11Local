import { useEffect } from 'react';
import Image from 'next/image';
import { Link } from 'react-router-dom';
import { Search, X, TriangleAlert, WifiOff, Lock, Info, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store.jsx';

/* ---------- Logo ---------- */
export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="11Local — Trang chủ">
      <Image className="logo-mark" src="/icon.svg" width={40} height={46} alt="" unoptimized />
      <span>11<em>Local</em></span>
    </Link>
  );
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

export function Toasts() {
  const { toasts } = useApp();
  const I = { success: CheckCircle2, error: TriangleAlert, info: Info };
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => { const Ic = I[t.type] || Info; return <div key={t.id} className={`toast ${t.type}`}><Ic size={18} />{t.msg}</div>; })}
    </div>
  );
}

