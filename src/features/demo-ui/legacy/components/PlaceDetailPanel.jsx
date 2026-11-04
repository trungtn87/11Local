"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Camera, ChevronLeft, ChevronRight, Edit3, Flag, ImageOff, Images,
  Info, MapPin, Navigation, Phone, Star, Store, X,
} from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "../../../places/google-maps";
import { ownershipMessage } from "../../../places/public-place-format";
import { PlaceFactSections } from "./PlaceFactSections.jsx";
import { PlaceReviews } from "./PlaceReviews.jsx";
import "../styles/place-detail-panel.css";

function PhotoGallery({ place, photos }) {
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState([]);
  const active = photos[index];
  const canDisplay = Boolean(active && !failedIds.includes(active.id));
  const move = (delta) => setIndex((current) => (current + delta + photos.length) % photos.length);

  return (
    <div className="local-detail-gallery">
      {canDisplay ? (
        <img
          key={active.id}
          src={"/api/place-photos/" + encodeURIComponent(active.id)}
          alt={active.alt || (place.name + " — ảnh " + (index + 1))}
          onError={() => setFailedIds((current) => current.includes(active.id) ? current : [...current, active.id])}
        />
      ) : (
        <div className="local-detail-empty-photo">
          <ImageOff size={32} strokeWidth={1.5} />
          <span>{active ? "Không tải được ảnh" : "Địa điểm chưa có ảnh được duyệt"}</span>
        </div>
      )}
      {photos.length > 1 && (
        <>
          <button className="local-detail-photo-prev" type="button" onClick={() => move(-1)} aria-label="Ảnh trước"><ChevronLeft size={20} /></button>
          <button className="local-detail-photo-next" type="button" onClick={() => move(1)} aria-label="Ảnh sau"><ChevronRight size={20} /></button>
        </>
      )}
      {photos.length > 0 && (
        <span className="local-detail-photo-count"><Images size={14} /> {index + 1}/{photos.length} ảnh</span>
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
  const [state, setState] = useState({ status: "loading", detail: null });
  const [reviewRating, setReviewRating] = useState(null);
  const closeButton = useRef(null);
  const countedViewId = useRef(null);

  useEffect(() => {
    // Previously the separate full page recorded views. Count the detail panel
    // instead so "Địa điểm hot" continues using real detail views.
    if (!place.id || countedViewId.current === place.id) return;
    countedViewId.current = place.id;
    fetch("/api/places/" + encodeURIComponent(place.id) + "/view", {
      method: "POST", keepalive: true,
    }).catch(() => {});
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
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const detail = state.detail || place;
  const photos = state.detail?.photos || [];
  const ratingCount = Number(reviewRating?.ratingCount ?? place.rating_count) || 0;
  const ratingAvg = Number(reviewRating?.ratingAvg ?? place.rating_avg);
  const hasRating = ratingCount > 0 && Number.isFinite(ratingAvg);

  return (
    <div className={"local-detail-layer local-detail-layer--" + mode}>
      <button type="button" className="local-detail-scrim" aria-label="Đóng thông tin chi tiết" onClick={onClose} />
      <aside className="local-detail-panel" role="dialog" aria-label={"Chi tiết " + place.name}>
        <div className="local-detail-topbar">
          <span><Info size={16} /> Thông tin địa điểm</span>
          <button ref={closeButton} type="button" onClick={onClose} className="local-detail-close" aria-label="Đóng bảng thông tin"><X size={18} /> Đóng</button>
        </div>

        {state.status === "loading" ? (
          <div className="local-detail-loading" role="status">Đang tải ảnh và thông tin chi tiết…</div>
        ) : state.status === "error" ? (
          <p className="local-detail-error" role="alert">Chưa tải được thông tin mở rộng. Các thông tin cơ bản bên dưới vẫn có thể xem.</p>
        ) : null}

        <PhotoGallery key={place.slug} place={detail} photos={photos} />
        <div className="local-detail-content">
          <div className="local-detail-name">
            <span className="local-detail-category">{detail.category_name || "Địa điểm"}</span>
            <h2>{detail.name}</h2>
            {detail.summary && <p className="local-detail-tagline">{detail.summary}</p>}
            <p className="local-detail-address"><MapPin size={16} /> {detail.address || detail.area || "Cao Bằng"}</p>
            <div className="local-detail-badges">
              {hasRating ? (
                <span className="local-detail-rating"><Star size={16} fill="currentColor" /> {ratingAvg.toFixed(1)} <small>({ratingCount} đánh giá)</small></span>
              ) : <span className="local-detail-muted">Chưa có đánh giá</span>}
              {ownershipMessage(detail.place_kind, detail.ownership_status) && <span className="local-detail-ownership"><BadgeCheck size={15}/>{ownershipMessage(detail.place_kind, detail.ownership_status)}</span>}
            </div>
          </div>

          <div className="local-detail-quick-actions">
            <a href={getGoogleMapsDirectionsUrl(detail)} target="_blank" rel="noopener noreferrer" className="primary">
              <Navigation size={17} /> Chỉ đường
            </a>
            {detail.phone ? <a href={"tel:" + detail.phone} className="secondary"><Phone size={17} /> Gọi điện</a> : null}
          </div>

          <PlaceFactSections place={detail} />
          <PlaceReviews placeId={place.id} placeSlug={place.slug} onRatingChange={setReviewRating} />
          <div className="local-detail-community-actions">
            <Link to={'/bao-sai/'+encodeURIComponent(detail.slug)+'?loai=report'} onClick={onClose}><Flag size={15}/> Báo sai</Link>
            <Link to={'/bao-sai/'+encodeURIComponent(detail.slug)+'?loai=edit_place'} onClick={onClose}><Edit3 size={15}/> Đề xuất sửa</Link>
            <Link to={'/bao-sai/'+encodeURIComponent(detail.slug)+'?loai=photo'} onClick={onClose}><Camera size={15}/> Gửi ảnh</Link>
          </div>

          {detail.place_kind === 'business' && <div className="local-detail-owner-callout">
              <div><Store size={20}/><span><strong>Bạn là chủ địa điểm này?</strong><small>Đăng nhập Google và gửi yêu cầu để Admin xác minh.</small></span></div>
              <Link to={'/nhan-quyen/'+encodeURIComponent(detail.slug)} onClick={onClose}>
                Yêu cầu nhận quyền quản lý
              </Link>
            </div>}
            <p className="local-detail-note">Thông tin và hình ảnh công khai đã qua kiểm duyệt 11Local.</p>
        </div>
      </aside>
    </div>
  );
}
