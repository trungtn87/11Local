"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, CheckCircle2, ChevronRight, Clock3, ExternalLink,
  EyeOff, RefreshCw, ShieldCheck, Star, XCircle,
} from "lucide-react";
import styles from "./reviews.module.css";

type Filter = "pending" | "approved" | "rejected" | "all";
type ReviewRow = {
  id: string;
  kind: "review" | "revision";
  review_id: string;
  revision_id: string | null;
  stars: number;
  content: string;
  status: string;
  submitted_at: string;
  version: number;
  place_id: string;
  place_slug: string;
  place_name: string;
  author_name: string;
};
type Feedback = { kind: "success" | "error"; text: string };
const filters: { id: Filter; label: string }[] = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối / Đã ẩn" },
  { id: "all", label: "Tất cả" },
];
const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối / Đã ẩn",
  superseded: "Đã được thay thế",
};
const failures: Record<string, string> = {
  STALE_VERSION: "Đánh giá vừa được thay đổi. Hãy tải lại trước khi xử lý.",
  ALREADY_REVIEWED: "Đánh giá hoặc bản sửa đã được xử lý ở phiên khác.",
  INVALID_STATE: "Trạng thái không cho phép thao tác này.",
  REASON_REQUIRED: "Hãy nhập lý do ít nhất 5 ký tự cho thao tác từ chối hoặc ẩn.",
  NOT_FOUND: "Đánh giá đã bị xóa.",
  UNAUTHORIZED: "Phiên Admin đã hết hạn, hãy đăng nhập lại.",
};
const localTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

export default function ReviewAdminApp() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/reviews?status=" + filter, {
        signal, cache: "no-store",
      });
      if (signal?.aborted) return;
      if (response.status === 401) {
        setAuth(false);
        setRows([]);
        return;
      }
      if (!response.ok) throw new Error("QUEUE_UNAVAILABLE");
      const body = await response.json();
      if (signal?.aborted) return;
      setRows(Array.isArray(body.reviews) ? body.reviews : []);
      setPendingTotal(Number(body.pendingTotal) || 0);
      setAuth(true);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setFeedback({ kind: "error", text: "Không tải được danh sách đánh giá. Hãy thử làm mới." });
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);

  const selected = rows.find(row => row.id === selectedId) ?? rows[0] ?? null;
  const pending = selected?.status === "pending";
  const canHide = selected?.kind === "review" && selected.status === "approved";
  const actionable = Boolean(pending || canHide);

  async function refresh() {
    setLoading(true);
    setFeedback(null);
    await load();
  }

  async function decide(action: "approve" | "reject" | "hide") {
    if (!selected || !actionable || busy) return;
    if (action !== "approve" && note.trim().length < 5) {
      setFeedback({ kind: "error", text: failures.REASON_REQUIRED });
      return;
    }
    if (action === "hide" && !window.confirm("Ẩn đánh giá công khai này khỏi 11Local?")) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/reviews/" + encodeURIComponent(selected.review_id) + "/decision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedVersion: Number(selected.version),
          revisionId: selected.kind === "revision" ? selected.revision_id : null,
          note: note.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) setAuth(false);
        setFeedback({ kind: "error", text: failures[data.error] || "Không xử lý được đánh giá. Vui lòng thử lại." });
        if (response.status === 409) await load();
        return;
      }
      setNote("");
      setSelectedId(null);
      setFeedback({ kind: "success", text: action === "approve"
        ? "Đã duyệt. Điểm công khai đã được cập nhật."
        : action === "hide" ? "Đã ẩn đánh giá khỏi trang công khai."
          : "Đã từ chối và ghi nhận lý do." });
      await load();
    } catch {
      setFeedback({ kind: "error", text: "Kết nối gặp sự cố. Đánh giá chưa được xử lý." });
    } finally {
      setBusy(false);
    }
  }

  if (auth === null && loading) return <main className={styles.gate}>Đang kiểm tra quyền Admin…</main>;
  if (auth === false) return <main className={styles.gate}>
    <div className={styles.gateCard}>
      <ShieldCheck size={35}/>
      <h1>Kiểm duyệt đánh giá</h1>
      <p>Chỉ Admin được xem đánh giá đang chờ và quyết định công khai.</p>
      <Link href="/admin" className={styles.primaryButton}>Đăng nhập Admin <ChevronRight size={16}/></Link>
    </div>
  </main>;

  return <main className={styles.root}>
    <header className={styles.header}>
      <div className={styles.headline}>
        <Link href="/admin" className={styles.back}><ArrowLeft size={15}/> Quản lý địa điểm</Link>
        <h1>Kiểm duyệt đánh giá</h1>
        <p>11Local · Đánh giá Google thực tế, kiểm duyệt trước khi công khai</p>
      </div>
      <div className={styles.headerActions}>
        <Link href="/admin/dong-gop" className={styles.secondaryButton}>Kiểm duyệt đóng góp</Link>
        <button type="button" onClick={() => void refresh()} disabled={busy || loading}
          className={styles.secondaryButton}><RefreshCw size={15}/> Làm mới</button>
      </div>
    </header>

    <div className={styles.stats}>
      <div><strong>{pendingTotal}</strong><small>Đánh giá / bản sửa chờ duyệt</small></div>
      <div><strong>{rows.length}</strong><small>Mục đang hiển thị theo bộ lọc</small></div>
      <div><strong>1–5 <Star size={16} fill="currentColor"/></strong><small>Thang điểm đánh giá</small></div>
    </div>

    <nav className={styles.filters} aria-label="Lọc đánh giá">
      {filters.map(item => <button key={item.id} type="button"
        aria-pressed={filter === item.id}
        onClick={() => {
          setFilter(item.id); setSelectedId(null); setNote("");
          setFeedback(null); setRows([]); setLoading(true);
        }}>{item.label}{item.id === "pending" && pendingTotal > 0 && <span>{pendingTotal}</span>}</button>)}
    </nav>

    {feedback && <p className={feedback.kind === "error" ? styles.error : styles.success}
      role={feedback.kind === "error" ? "alert" : "status"}>
      {feedback.kind === "success" ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
      {feedback.text}
    </p>}

    <div className={styles.columns}>
      <aside className={styles.queue}>
        <div className={styles.queueHeading}><h2>Danh sách đánh giá</h2><small>{loading ? "Đang tải…" : "Tối đa 100 mục gần nhất"}</small></div>
        {!loading && rows.length === 0 && <p className={styles.empty}>Chưa có đánh giá ở trạng thái này.</p>}
        {rows.map(item => <button type="button" key={item.id}
          className={styles.queueItem} data-selected={selected?.id === item.id}
          onClick={() => { setSelectedId(item.id); setNote(""); setFeedback(null); }}>
          <strong>{item.place_name}</strong>
          <small>{item.author_name || "Thành viên 11Local"} · {item.kind === "revision" ? "Sửa đánh giá" : "Đánh giá mới"}</small>
          <div className={styles.queueStars} aria-label={item.stars + " sao"}>
            {[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n <= item.stars ? "currentColor" : "none"}/>)}
          </div>
          <span className={styles.itemExcerpt}>{item.content || "(Chỉ chấm sao)"}</span>
          <span className={styles.itemFoot}><Clock3 size={12}/>{localTime(item.submitted_at)}
            <em data-status={item.status}>{statusLabels[item.status] || item.status}</em>
          </span>
        </button>)}
      </aside>

      <section className={styles.detail}>
        {loading && !rows.length ? <p className={styles.empty}>Đang tải đánh giá từ Neon…</p> :
          !selected ? <div className={styles.blank}>
            <ShieldCheck size={38}/>
            <h2>Không có mục cần xem</h2>
            <p>Đánh giá mới và bản chỉnh sửa sẽ xuất hiện ở đây sau khi người dùng gửi.</p>
          </div> : <>
            <div className={styles.detailHead}>
              <div>
                <span className={styles.overline}>{selected.kind === "revision" ? "Bản chỉnh sửa chờ duyệt" : "Đánh giá địa điểm"}</span>
                <h2>{selected.place_name}</h2>
                <p>Người đánh giá: <strong>{selected.author_name || "Thành viên 11Local"}</strong></p>
              </div>
              <Link href={"/ban-do?place=" + encodeURIComponent(selected.place_slug) + "&detail=1"}
                target="_blank" rel="noopener noreferrer" className={styles.placeLink}>
                Xem địa điểm <ExternalLink size={14}/>
              </Link>
            </div>
            <div className={styles.detailBody}>
              <div className={styles.meta}>
                <span><Clock3 size={15}/> {localTime(selected.submitted_at)}</span>
                <span className={styles.status} data-status={selected.status}>{statusLabels[selected.status] || selected.status}</span>
              </div>
              <div className={styles.bigStars} aria-label={selected.stars + " trên 5 sao"}>
                {[1,2,3,4,5].map(n => <Star key={n} size={24} fill={n <= selected.stars ? "currentColor" : "none"}/>)}
                <strong>{selected.stars}/5</strong>
              </div>
              <div className={styles.content}>
                <h3>Nội dung người dùng gửi</h3>
                <p>{selected.content || "Người dùng chỉ chấm sao, không viết nhận xét."}</p>
              </div>
              {selected.kind === "revision" && <p className={styles.hint}>
                Đây là bản sửa. Nội dung và số sao đã duyệt trước đó vẫn công khai cho đến khi bạn duyệt bản sửa này.
              </p>}
              {actionable ? <div className={styles.decision}>
                <h3>Quyết định của Admin</h3>
                <label htmlFor="review-moderation-note">
                  Ghi chú {pending ? "(không bắt buộc khi duyệt)" : "(bắt buộc khi ẩn)"}
                </label>
                <textarea id="review-moderation-note" maxLength={500} value={note}
                  onChange={event => setNote(event.target.value)}
                  rows={3} placeholder="Nêu lý do nếu từ chối hoặc ẩn…"/>
                <small>Việc duyệt, từ chối hoặc ẩn đều được lưu vào nhật ký kiểm duyệt.</small>
                <div className={styles.decisions}>
                  {pending && <>
                    <button type="button" className={styles.approve} disabled={busy || loading}
                      onClick={() => void decide("approve")}><CheckCircle2 size={16}/> Duyệt công khai</button>
                    <button type="button" className={styles.reject} disabled={busy || loading}
                      onClick={() => void decide("reject")}><XCircle size={16}/> Từ chối</button>
                  </>}
                  {canHide && <button type="button" className={styles.reject} disabled={busy || loading}
                    onClick={() => void decide("hide")}><EyeOff size={16}/> Ẩn đánh giá</button>}
                </div>
              </div> : <div className={styles.completed}><ShieldCheck size={17}/>
                Mục này đã được xử lý. Không thể duyệt lại cùng phiên bản.
              </div>}
            </div>
          </>}
      </section>
    </div>
  </main>;
}
