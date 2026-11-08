"use client";
import { PublicMenu } from "@/components/menu/public-menu";
import { PlacePopularity } from "@/components/place-popularity";
import { recordPlaceView } from "@/components/visit-tracker";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, BookOpen, Camera, ChevronLeft, ChevronRight, Edit3, Flag, ImageOff, Images,
  Info, LogIn, MapPin, Maximize2, Navigation, Phone, Star, Store, X,
} from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "../../../places/google-maps";
import { ownershipMessage } from "../../../places/public-place-format";
import { PlaceFactSections } from "./PlaceFactSections.jsx";
import { PlaceReviews } from "./PlaceReviews.jsx";
import { Lightbox, PhotoCard } from "./ui.jsx";
import { useApp } from "../store.jsx";
import "../styles/place-detail-panel.css";

function PhotoGallery({ place, photos, onOpenLightbox }) {
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState([]);
  const active = photos[index];
  const canDisplay = Boolean(active && !failedIds.includes(active.id));
  const move = (delta) => setIndex((current) => (current + delta + photos.length) % photos.length);

  return (
    <div className="local-detail-gallery">
      {canDisplay ? (
        <button
          type="button"
          className="local-detail-cover-btn"
          onClick={() => onOpenLightbox?.(index)}
          aria-label={`Phóng to ảnh ${index + 1} của ${place.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active.id}
            src={"/api/place-photos/" + encodeURIComponent(active.id) + "?size=detail"}
            alt={active.alt || (place.name + " — ảnh " + (index + 1))}
            decoding="async"
            onError={() => setFailedIds((current) => current.includes(active.id) ? current : [...current, active.id])}
          />
          <span className="local-detail-zoom-badge">
            <Maximize2 size={13} /> Phóng to
          </span>
        </button>
      ) : (
        <div className="local-detail-empty-photo">
          <ImageOff size={32} strokeWidth={1.5} />
          <span>{active ? "Không tải được ảnh" : "Album chưa có ảnh được duyệt"}</span>
        </div>
      )}
      {photos.length > 1 && (
        <>
          <button className="local-detail-photo-prev" type="button" onClick={() => move(-1)} aria-label="Ảnh trước"><ChevronLeft size={20} /></button>
          <button className="local-detail-photo-next" type="button" onClick={() => move(1)} aria-label="Ảnh sau"><ChevronRight size={20} /></button>
        </>
      )}
      {photos.length > 0 && (
        <button
          type="button"
          className="local-detail-photo-count"
          onClick={() => onOpenLightbox?.(index)}
        >
          <Images size={14} /> {index + 1}/{photos.length} ảnh
        </button>
      )}
    </div>
  );
}

/**
 * Shared desktop right-side panel (map or search) / mobile bottom sheet.
 * Receives only approved places returned by /api/places, fetches additional
 * moderation-gated information, and never fabricates operating hours or prices.
 */
export function PlaceDetailPanel({ place, onClose, mode = "map" }) {
  const { currentUser } = useApp();
  const [state, setState] = useState({ status: "loading", detail: null });
  const [reviewRating, setReviewRating] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const closeButton = useRef(null);
  const countedViewId = useRef(null);

  useEffect(() => {
    if (!place.id || countedViewId.current === place.id) return;
    countedViewId.current = place.id;
    void recordPlaceView(place.id);
  }, [place.id]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/places/" + encodeURIComponent(place.slug) + "/detail", {
      signal: ctrl.signal, cache: "no-store",
    })
      .then((res) => { if (!res.ok) throw new Error("DETAIL_UNAVAILABLE"); return res.json(); })
      .then((body) => setState({ status: "ready", detail: body.place }))
      .catch((error) => {
        if (error.name !== "AbortError") setState({ status: "error", detail: null });
      });
    return () => ctrl.abort();
  }, [place.slug]);

  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !lightboxOpen) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, lightboxOpen]);

  const detail = state.detail || place;
  const photos = state.detail?.photos || [];
  const ratingCount = Number(reviewRating?.ratingCount ?? place.rating_count) || 0;
  const ratingAvg = Number(reviewRating?.ratingAvg ?? place.rating_avg);
  const hasRating = ratingCount > 0 && Number.isFinite(ratingAvg);
  const openLightboxAt = (idx) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  return (
    <div className={"local-detail-layer local-detail-layer--" + mode}>
      <button type="button" className="local-detail-scrim" aria-label="Đóng thông tin chi tiết" onClick={onClose} />
      <aside className="local-detail-panel" role="dialog" aria-label={"Chi tiết " + place.name}>
        <div className="local-detail-topbar">
          <span><Info size={16} /> Album & Kỷ niệm</span>
          <button ref={closeButton} type="button" onClick={onClose} className="local-detail-close" aria-label="Đóng bảng thông tin"><X size={18} /> Đóng</button>
        </div>

        {state.status === "loading" ? (
          <div className="local-detail-loading" role="status">Đang tải ảnh và nội dung album…</div>
        ) : state.status === "error" ? (
          <p className="local-detail-error" role="alert">Chưa tải được thông tin mở rộng. Các thông tin cơ bản bên dưới vẫn có thể xem.</p>
        ) : null}

        <PhotoGallery key={place.slug} place={detail} photos={photos} onOpenLightbox={openLightboxAt} />
        <div className="local-detail-content">
          <div className="local-detail-name">
            <span className="local-detail-category">{detail.category_name || "Album kỷ niệm"}</span>
            <h2>{detail.name}</h2>
            {detail.summary && <p className="local-detail-tagline">{detail.summary}</p>}
            <p className="local-detail-address"><MapPin size={16} /> {detail.address || detail.area || "Cao Bằng"}</p>
            <div className="local-detail-badges">
              {hasRating ? (
                <span className="local-detail-rating"><Star size={16} fill="currentColor" /> {ratingAvg.toFixed(1)} <small>({ratingCount} cảm nhận)</small></span>
              ) : <span className="local-detail-muted">Chưa có cảm nhận</span>}
              {ownershipMessage(detail.place_kind, detail.ownership_status) && <span className="local-detail-ownership"><BadgeCheck size={15}/>{ownershipMessage(detail.place_kind, detail.ownership_status)}</span>}
            </div>
          </div>

          {photos.length > 0 && (
            <section className="gau-album-gallery-section" aria-label={`Danh sách ảnh của ${detail.name}`}>
              <div className="gau-album-gallery-head">
                <h3><Images size={15} /> Ảnh trong album ({photos.length})</h3>
                <small>Chạm ảnh để xem phóng to</small>
              </div>
              <div className="gau-photo-grid">
                {photos.map((item, idx) => (
                  <PhotoCard key={item.id} photo={item} index={idx} albumName={detail.name} onOpen={openLightboxAt} />
                ))}
              </div>
            </section>
          )}

          {/* Contribute Photo Callout depending on Google Login state */}
          <div className="gau-contribute-callout">
            {currentUser ? (
              <div className="gau-contribute-callout-box logged-in">
                <div>
                  <strong>Đóng góp ảnh vào album này</strong>
                  <p>Ảnh bạn gửi sẽ được Admin duyệt trước khi hiển thị công khai.</p>
                </div>
                <Link to={"/bao-sai/" + encodeURIComponent(detail.slug) + "?loai=photo"} onClick={onClose} className="btn btn-primary btn-sm">
                  <Camera size={15} /> Đóng góp ảnh
                </Link>
              </div>
            ) : (
              <div className="gau-contribute-callout-box guest">
                <div>
                  <strong>Bạn muốn góp thêm ảnh cho Gấu?</strong>
                  <p>Hãy đăng nhập Google để gửi ảnh kỷ niệm vào album này.</p>
                </div>
                <a
                  href={"/api/auth/google/start?returnTo=" + encodeURIComponent("/dia-diem/" + detail.slug)}
                  className="btn btn-accent btn-sm"
                >
                  <LogIn size={15} /> Đăng nhập Google
                </a>
              </div>
            )}
          </div>

          <PlacePopularity key={place.id} place={detail} />
          <div className="local-detail-quick-actions">
            <a href={'/dia-diem/' + encodeURIComponent(place.slug)} className="primary">
              <BookOpen size={17} /> Mở trọn trang Album
            </a>
            <a href={getGoogleMapsDirectionsUrl(detail)} target="_blank" rel="noopener noreferrer" className="secondary">
              <Navigation size={17} /> Chỉ đường
            </a>
            {detail.phone ? <a href={"tel:" + detail.phone} className="secondary"><Phone size={17} /> Gọi</a> : null}
          </div>

          <PlaceFactSections place={detail} />
          <PublicMenu key={place.id} placeId={place.id}/>
          <PlaceReviews placeId={place.id} placeSlug={place.slug} onRatingChange={setReviewRating} />
          <div className="local-detail-community-actions">
            <Link to={'/bao-sai/'+encodeURIComponent(detail.slug)+'?loai=photo'} onClick={onClose}><Camera size={15}/> Góp thêm ảnh</Link>
            <Link to={'/bao-sai/'+encodeURIComponent(detail.slug)+'?loai=edit_place'} onClick={onClose}><Edit3 size={15}/> Đề xuất sửa</Link>
            <Link to={'/bao-sai/'+encodeURIComponent(detail.slug)+'?loai=report'} onClick={onClose}><Flag size={15}/> Báo sai</Link>
          </div>

          {detail.place_kind === 'business' && <div className="local-detail-owner-callout">
              <div><Store size={20}/><span><strong>Bạn quản lý địa điểm này?</strong><small>Đăng nhập Google và gửi yêu cầu để Admin xác minh.</small></span></div>
              <Link to={'/nhan-quyen/'+encodeURIComponent(detail.slug)} onClick={onClose}>
                Yêu cầu nhận quyền quản lý
              </Link>
            </div>}
            <p className="local-detail-note">Hình ảnh và kỷ niệm công khai được kiểm duyệt bởi Admin Nhà của Gấu.</p>
        </div>
      </aside>
      <Lightbox
        open={lightboxOpen}
        photos={photos}
        index={lightboxIndex}
        albumName={detail.name}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
