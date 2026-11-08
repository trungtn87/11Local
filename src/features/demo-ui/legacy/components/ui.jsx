import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, TriangleAlert, WifiOff, Lock, Info, CheckCircle2,
  Calendar, Images, User, ChevronLeft, ChevronRight, Navigation, BookOpen,
} from 'lucide-react';
import { useApp } from '../store.jsx';
import { GauLogoMark, GauEmptyMascot } from '@/components/gau-mascot';
import { RealPlaceCover } from './RealPlaceCover.jsx';
import { getGoogleMapsDirectionsUrl } from '../../../places/google-maps';

/* ---------- Logo ---------- */
export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="Nhà của Gấu — Trang chủ">
      <GauLogoMark className="logo-mark" width={40} height={40} />
      <span className="logo-text">
        <strong>Nhà của <em>Gấu</em></strong>
      </span>
    </Link>
  );
}

/* ---------- Buttons (12-16px radius) ---------- */
export function Button({ variant = 'primary', size, block, loading, icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      className={`btn btn-${variant} ${size ? 'btn-' + size : ''} ${block ? 'btn-block' : ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} /> : null}
      {children}
    </button>
  );
}

/* ---------- Search ---------- */
export function SearchBar({ value, onChange, onSubmit, placeholder = 'Tìm album, kỷ niệm, chuyến đi của Gấu…', compact, autoFocus }) {
  return (
    <form
      className={`searchbar ${compact ? 'compact' : ''}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <Search size={18} aria-hidden />
      <input
        aria-label="Tìm kiếm album và kỷ niệm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          style={{ width: 34, minHeight: 34 }}
          aria-label="Xóa từ khóa"
          onClick={() => onChange('')}
        >
          <X size={16} />
        </button>
      )}
      {!compact && (
        <button type="submit" className="btn btn-primary btn-sm">
          Tìm
        </button>
      )}
    </form>
  );
}

/* ---------- Field ---------- */
export function Field({ label, required, hint, error, children, htmlFor }) {
  return (
    <div className="field">
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="req" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && (
        <span className="err-text" role="alert">
          <TriangleAlert size={13} /> {error}
        </span>
      )}
    </div>
  );
}

/* ---------- Banner ---------- */
const bIcon = { info: Info, warning: TriangleAlert, danger: TriangleAlert, success: CheckCircle2, demo: Info };
export function Banner({ type = 'info', children, title }) {
  const I = bIcon[type] || Info;
  return (
    <div className={`banner banner-${type}`} role={type === 'danger' ? 'alert' : 'note'}>
      <I size={18} />
      <div>
        {title && <b>{title} </b>}
        {children}
      </div>
    </div>
  );
}

/* ---------- EmptyState / StateBlock ---------- */
export function EmptyState({ kind = 'empty', title, children, actions, showMascot = true }) {
  const icon = {
    empty: showMascot ? <GauEmptyMascot width={84} height={78} /> : <Search size={28} />,
    error: <TriangleAlert size={28} />,
    offline: <WifiOff size={28} />,
    restricted: <Lock size={28} />,
  }[kind];
  return (
    <div
      className={`state ${kind === 'error' || kind === 'offline' ? 'error' : kind === 'restricted' ? 'restricted' : ''}`}
      role={kind === 'error' ? 'alert' : undefined}
    >
      <div className={kind === 'empty' && showMascot ? 'state-mascot' : 'ico'}>{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {actions && (
        <div className="row-wrap" style={{ justifyContent: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export const StateBlock = EmptyState;

/* ---------- LoadingState / CardSkeletons ---------- */
export function LoadingState({ n = 6, label = 'Đang tải danh sách album kỷ niệm…' }) {
  return (
    <div className="place-grid" aria-busy="true" aria-label={label}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="place-card album-card">
          <div className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 0 }} />
          <div className="pc-body">
            <div className="skeleton" style={{ height: 16, width: '80%' }} />
            <div className="skeleton" style={{ height: 12, width: '55%' }} />
            <div className="skeleton" style={{ height: 12, width: '35%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export const CardSkeletons = LoadingState;

/* ---------- Reusable AlbumCard ---------- */
export function formatAlbumDate(dateStr) {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  if (!Number.isFinite(parsed)) return null;
  try {
    return new Date(parsed).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function AlbumCard({ place, distanceLabel, onDetails, priority = false }) {
  const dateLabel = formatAlbumDate(place.updated_at || place.created_at);
  const photoCount = Array.isArray(place.photos)
    ? place.photos.length
    : typeof place.photo_count === 'number'
      ? place.photo_count
      : null;
  const creatorLabel = place.ownership_status === 'verified'
    ? 'Gia đình xác minh'
    : 'Gia đình Gấu';
  const detailHref = '/dia-diem/' + encodeURIComponent(place.slug);

  return (
    <article className="place-card real-place-card album-card">
      <Link
        to={detailHref}
        className="real-place-main"
        aria-label={`Mở album ${place.name}`}
      >
        <div className="pc-img">
          <RealPlaceCover place={place} priority={priority} />
          <div className="album-card-badges">
            {place.category_name && (
              <span className="album-chip-category">{place.category_name}</span>
            )}
            {photoCount !== null ? (
              <span className="album-chip-photos" title="Số lượng ảnh đã duyệt">
                <Images size={12} /> {photoCount} ảnh
              </span>
            ) : place.cover_photo_id ? (
              <span className="album-chip-photos" title="Có ảnh kỷ niệm">
                <Images size={12} /> Có ảnh bìa
              </span>
            ) : null}
          </div>
        </div>
        <div className="pc-body">
          <span className="pc-name">{place.name}</span>
          <span className="pc-meta">
            {place.area || 'Cao Bằng'}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </span>
          {place.summary && <p className="real-place-summary">{place.summary}</p>}
          <div className="album-card-footer-meta">
            <span className="album-creator">
              <User size={12} aria-hidden="true" /> {creatorLabel}
            </span>
            {distanceLabel && (
              <span className="xs muted" title="Khoảng cách đường thẳng">
                {distanceLabel}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="real-place-actions">
        {onDetails ? (
          <button
            className="real-place-detail-action"
            type="button"
            onClick={() => onDetails(place)}
          >
            <BookOpen size={13} /> Xem nhanh
          </button>
        ) : (
          <Link
            className="real-place-detail-action"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            to={detailHref}
          >
            <BookOpen size={13} /> Mở album
          </Link>
        )}
        <a
          className="real-place-direction"
          href={getGoogleMapsDirectionsUrl(place)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Chỉ đường đến ${place.name}`}
        >
          <Navigation size={14} /> Bản đồ
        </a>
      </div>
    </article>
  );
}

/* ---------- Reusable PhotoCard ---------- */
export function PhotoCard({ photo, index = 0, albumName = 'Album của Gấu', onOpen }) {
  const src = `/api/place-photos/${encodeURIComponent(photo.id)}?size=card`;
  const alt = photo.alt || photo.caption || `${albumName} — ảnh ${index + 1}`;
  const dateLabel = formatAlbumDate(photo.created_at || photo.taken_at);
  const authorLabel = photo.uploader_name || photo.author_name || null;

  return (
    <figure className="gau-photo-card">
      <button
        type="button"
        className="gau-photo-card-btn"
        onClick={() => onOpen?.(index)}
        aria-label={`Xem phóng to ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading={index < 2 ? 'eager' : 'lazy'}
          decoding="async"
        />
      </button>
      {(photo.caption || authorLabel || dateLabel) && (
        <figcaption className="gau-photo-card-caption">
          {photo.caption && <p>{photo.caption}</p>}
          {(authorLabel || dateLabel) && (
            <small>
              {authorLabel && <span><User size={11} /> {authorLabel}</span>}
              {dateLabel && <span><Calendar size={11} /> {dateLabel}</span>}
            </small>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/* ---------- Dialog / Sheet / Lightbox ---------- */
export function Dialog({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Sheet = Dialog;

/**
 * @param {{
 *   open: boolean;
 *   photos?: Array<Record<string, any>>;
 *   index?: number;
 *   albumName?: string;
 *   onClose?: () => void;
 *   onIndexChange?: (idx: number) => void;
 * }} props
 */
export function Lightbox({ open, photos = [], index = 0, albumName = 'Album của Gấu', onClose, onIndexChange }) {
  const total = photos.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const active = photos[safeIndex];

  useEffect(() => {
    if (!open || !total) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft' && total > 1) onIndexChange?.((safeIndex - 1 + total) % total);
      if (e.key === 'ArrowRight' && total > 1) onIndexChange?.((safeIndex + 1) % total);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, total, safeIndex, onClose, onIndexChange]);

  if (!open || !active) return null;
  const dateLabel = formatAlbumDate(active.created_at || active.taken_at);
  const authorLabel = active.uploader_name || active.author_name || null;

  return (
    <div
      className="overlay gau-lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${albumName}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="gau-lightbox-topbar">
        <div className="gau-lightbox-title">
          <strong>{albumName}</strong>
          <span>Ảnh {safeIndex + 1} / {total}</span>
        </div>
        <button type="button" className="gau-lightbox-close" onClick={onClose} aria-label="Đóng chế độ xem ảnh">
          <X size={20} /> Đóng
        </button>
      </div>

      <div className="gau-lightbox-stage">
        {total > 1 && (
          <button
            type="button"
            className="gau-lightbox-nav gau-lightbox-prev"
            onClick={() => onIndexChange?.((safeIndex - 1 + total) % total)}
            aria-label="Ảnh trước"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="gau-lightbox-img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active.id}
            src={`/api/place-photos/${encodeURIComponent(active.id)}?size=detail`}
            alt={active.alt || active.caption || `${albumName} — ảnh ${safeIndex + 1}`}
          />
        </div>
        {total > 1 && (
          <button
            type="button"
            className="gau-lightbox-nav gau-lightbox-next"
            onClick={() => onIndexChange?.((safeIndex + 1) % total)}
            aria-label="Ảnh tiếp theo"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      <div className="gau-lightbox-footer">
        {active.caption ? (
          <p className="gau-lightbox-caption">{active.caption}</p>
        ) : (
          <p className="gau-lightbox-caption muted">Kỷ niệm được lưu giữ tại {albumName}</p>
        )}
        <div className="gau-lightbox-meta">
          {authorLabel ? (
            <span><User size={13} /> Người đăng: {authorLabel}</span>
          ) : (
            <span><User size={13} /> Gia đình Gấu</span>
          )}
          {dateLabel && <span><Calendar size={13} /> Ngày chụp/đăng: {dateLabel}</span>}
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  const I = { success: CheckCircle2, error: TriangleAlert, info: Info };
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Ic = I[t.type] || Info;
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <Ic size={18} />
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}
