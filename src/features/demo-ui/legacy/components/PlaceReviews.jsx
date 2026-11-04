"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, ShieldCheck, Star, Trash2 } from "lucide-react";
import { useApp } from "../store.jsx";
import { reviewFeedback, reviewPageCount, reviewRatingRows, reviewStatusMessage } from "../../../places/review-ui";
import "../styles/place-reviews.css";

function Stars({ count, size = 16 }) {
  return <span className="local-reviews-stars" aria-label={count + " trên 5 sao"}>
    {[1, 2, 3, 4, 5].map(n =>
      <Star key={n} size={size} aria-hidden="true" fill={n <= count ? "currentColor" : "none"}
        className={n <= count ? "filled" : "empty"} />)}
  </span>;
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}

function signInToReview(slug) {
  const returnTo = "/ban-do?place=" + encodeURIComponent(slug) + "&detail=1";
  window.location.assign("/api/auth/google/start?returnTo=" + encodeURIComponent(returnTo));
}

export function PlaceReviews({ placeId, placeSlug, onRatingChange }) {
  const { currentUser, authState } = useApp();
  const [snapshot, setSnapshot] = useState({ status: "loading", payload: null });
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!placeId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      placeId, page: String(expanded ? page : 1), limit: expanded ? "10" : "2",
    });
    fetch("/api/reviews?" + query, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("REVIEWS_UNAVAILABLE");
        return response.json();
      })
      .then(payload => {
        setSnapshot({ status: "ready", payload });
        onRatingChange?.({ ratingAvg: Number(payload.ratingAvg), ratingCount: Number(payload.ratingCount) });
      })
      .catch(error => {
        if (error.name !== "AbortError") setSnapshot({ status: "error", payload: null });
      });
    return () => controller.abort();
  }, [placeId, expanded, page, revision, onRatingChange]);

  const data = snapshot.payload;
  const mine = data?.mine?.deleted_at ? null : data?.mine ?? null;
  const count = data ? Math.max(0, Number(data.ratingCount) || 0) : 0;
  const rating = data && count > 0 ? Number(data.ratingAvg) : null;
  const rows = data ? reviewRatingRows(data.distribution || [], count) : [];
  const pages = reviewPageCount(count);
  const canEdit = Boolean(currentUser && mine);
  const pendingRevision = Boolean(mine?.pending_revision_id);

  function openForm() {
    setStars(Number(mine?.pending_stars ?? mine?.stars ?? 0));
    setContent(mine?.pending_content ?? mine?.content ?? "");
    setNotice(null);
    setFormOpen(true);
  }

  async function submitReview(event) {
    event.preventDefault();
    if (stars < 1 || stars > 5) {
      setNotice({ type: "error", text: "Hãy chọn số sao để tiếp tục." });
      return;
    }
    setBusy(true); setNotice(null);
    const editing = Boolean(mine);
    try {
      const response = await fetch(editing
        ? "/api/reviews/" + encodeURIComponent(mine.id) : "/api/reviews", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing
          ? { stars, content, expectedVersion: Number(mine.version) }
          : { placeId, stars, content }),
      });
      const body = await response.json();
      if (!response.ok) {
        setNotice({ type: "error", text: reviewFeedback(body.error || "") });
        if (response.status === 409) setRevision(n => n + 1);
        return;
      }
      setFormOpen(false);
      setNotice({ type: "success", text: "Đã gửi đánh giá. Admin sẽ duyệt trước khi công khai." });
      setRevision(n => n + 1);
    } catch {
      setNotice({ type: "error", text: "Không gửi được đánh giá. Kiểm tra kết nối rồi thử lại." });
    } finally {
      setBusy(false);
    }
  }

  async function removeReview() {
    if (!mine || !window.confirm("Xóa đánh giá của bạn tại địa điểm này?")) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/reviews/" + encodeURIComponent(mine.id), { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) {
        setNotice({ type: "error", text: reviewFeedback(body.error || "") });
        return;
      }
      setFormOpen(false);
      setNotice({ type: "success", text: "Đã xóa đánh giá của bạn." });
      setPage(1);
      setRevision(n => n + 1);
    } catch {
      setNotice({ type: "error", text: "Chưa xóa được. Vui lòng thử lại." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="local-reviews" aria-label="Đánh giá địa điểm" id="danh-gia">
    <div className="local-reviews-heading">
      <h3><Star size={19} /> Đánh giá từ cộng đồng</h3>
      <small>Chỉ tính đánh giá đã được duyệt</small>
    </div>
    {snapshot.status === "loading" && <p className="local-reviews-muted" role="status">Đang tải đánh giá thật…</p>}
    {snapshot.status === "error" && <div className="local-reviews-alert" role="alert">
      Không tải được đánh giá. <button type="button" onClick={() => {
        setSnapshot({ status: "loading", payload: null });
        setRevision(n => n + 1);
      }}>Thử lại</button>
    </div>}
    {data && <div className="local-reviews-summary">
      <div className="local-reviews-score">
        {count > 0 && Number.isFinite(rating)
          ? <><strong>{rating.toFixed(1)}</strong><Stars count={Math.round(rating)} size={15} /></>
          : <strong className="local-reviews-no-score">—</strong>}
        <span>{count ? count + " đánh giá" : "Chưa có đánh giá"}</span>
      </div>
      <div className="local-reviews-bars" aria-label="Phân bố số sao">
        {rows.map(row => <div key={row.stars} className="local-reviews-bar">
          <span>{row.stars}<Star size={12} fill="currentColor" /></span>
          <div className="local-reviews-track" aria-hidden="true"><i style={{ width: row.ratio + "%" }}/></div>
          <small>{row.count}</small>
        </div>)}
      </div>
    </div>}

    {authState === "loading" && <p className="local-reviews-muted">Đang kiểm tra tài khoản…</p>}
    {authState !== "loading" && !currentUser && <div className="local-reviews-cta">
      <p>Chia sẻ trải nghiệm của bạn về địa điểm này.</p>
      <button type="button" className="local-reviews-primary" onClick={() => signInToReview(placeSlug)}>
        <Pencil size={15} /> Đăng nhập Google để đánh giá
      </button>
    </div>}
    {currentUser && data && <div className="local-reviews-cta">
      {mine && <p className="local-reviews-own-status"><ShieldCheck size={15} />
        {reviewStatusMessage(mine.status, pendingRevision)}
      </p>}
      {!formOpen ? <div className="local-reviews-actions">
        <button type="button" className="local-reviews-primary" onClick={openForm}>
          <Pencil size={15}/>{canEdit ? "Sửa đánh giá của bạn" : "Viết đánh giá"}
        </button>
        {mine && <button type="button" className="local-reviews-delete" disabled={busy}
          onClick={removeReview}><Trash2 size={14}/> Xóa</button>}
      </div> : <form className="local-reviews-form" onSubmit={submitReview}>
        <strong>{canEdit ? "Chỉnh sửa đánh giá" : "Đánh giá địa điểm"}</strong>
        <div className="local-reviews-star-input" role="group" aria-label="Chọn số sao">
          {[1, 2, 3, 4, 5].map(n => <button type="button" key={n}
            aria-label={n + " sao"} aria-pressed={stars === n}
            title={n + " sao"} onClick={() => setStars(n)} disabled={busy}>
            <Star size={29} fill={n <= stars ? "currentColor" : "none"}
              className={n <= stars ? "selected" : ""}/>
          </button>)}
        </div>
        <label htmlFor={"local-review-content-" + placeId}>Trải nghiệm của bạn (không bắt buộc)</label>
        <textarea id={"local-review-content-" + placeId} value={content}
          onChange={event => setContent(event.target.value)}
          maxLength={1000} rows={4} placeholder="Điều gì khiến bạn hài lòng, hoặc cần cải thiện?"
          disabled={busy}/>
        <small className="local-reviews-counter">{content.length}/1000 ký tự</small>
        <p className="local-reviews-muted">Đánh giá được Admin xem xét trước khi công khai.</p>
        <div className="local-reviews-actions">
          <button type="submit" className="local-reviews-primary" disabled={busy || !stars}>
            {busy ? "Đang gửi…" : "Gửi đánh giá"}
          </button>
          <button type="button" className="local-reviews-secondary" onClick={() => setFormOpen(false)}
            disabled={busy}>Hủy</button>
        </div>
      </form>}
    </div>}
    {notice && <p className={"local-reviews-notice " + notice.type} role="status">{notice.text}</p>}

    {data && <div className="local-reviews-list">
      {count === 0 ? <p className="local-reviews-muted">Chưa có đánh giá được duyệt. Hãy là người đầu tiên chia sẻ!</p> : <>
        <div className="local-reviews-list-title"><strong>Nhận xét của mọi người</strong>
          <small>Mới nhất</small></div>
        {data.reviews.length ? data.reviews.map(item => <article key={item.id} className="local-reviews-item">
          <div className="local-reviews-avatar" aria-hidden="true">
            {(item.author_name || "K").trim().charAt(0).toUpperCase()}
          </div>
          <div className="local-reviews-entry">
            <strong>{item.author_name || "Thành viên 11Local"}</strong>
            <div className="local-reviews-item-meta"><Stars count={Number(item.stars)}/><time dateTime={item.created_at}>{dateText(item.created_at)}</time></div>
            {item.content && <p>{item.content}</p>}
          </div>
        </article>) : <p className="local-reviews-muted">Chưa tải được danh sách cho trang này.</p>}
        {!expanded && count > 2 && <button type="button" className="local-reviews-more"
          onClick={() => { setExpanded(true); setPage(1); }}>
          Xem tất cả {count} đánh giá <ChevronRight size={16}/>
        </button>}
        {expanded && pages > 1 && <div className="local-reviews-pages">
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}><ChevronLeft size={15}/> Trước</button>
          <span>Trang {page}/{pages}</span>
          <button type="button" onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages}>Sau <ChevronRight size={15}/></button>
        </div>}
        {expanded && <button type="button" className="local-reviews-less"
          onClick={() => { setExpanded(false); setPage(1); }}>Thu gọn đánh giá</button>}
      </>}
    </div>}
  </section>;
}
