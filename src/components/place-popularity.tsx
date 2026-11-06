"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, Info, Star } from "lucide-react";
import { hotBreakdown, hotScore, type HotBreakdown } from "@/features/places/hot-ranking";
import "./place-popularity.css";

type PlacePopularityData = {
  id: string;
  slug: string;
  rating_avg?: number | string | null;
  rating_count?: number | string | null;
  like_count?: number | string | null;
  view_count?: number | string | null;
  views_30d?: number | string | null;
  hot_score?: number | null;
  hot_rank?: number | null;
  hot_breakdown?: HotBreakdown | null;
};

const n = (value: unknown) => Math.max(0, Number(value) || 0);
const display = (value: unknown) => n(value).toLocaleString("vi-VN");

export function PlacePopularityCompact({ place }: { place: PlacePopularityData }) {
  const ratingCount = n(place.rating_count);
  return <div className="place-popularity-compact" aria-label="Thống kê công khai địa điểm">
    <span title="Đánh giá đã duyệt"><Star size={13} aria-hidden="true" /> {ratingCount ? n(place.rating_avg).toFixed(1) + " (" + display(ratingCount) + ")" : "0 đánh giá"}</span>
    <span title="Lượt yêu thích"><Heart size={13} aria-hidden="true" /> {display(place.like_count)}</span>
    <span title="Tổng lượt xem"><Eye size={13} aria-hidden="true" /> {display(place.view_count)}</span>
    {place.hot_rank != null && <span title="Điểm hot minh bạch">#{place.hot_rank} · {n(place.hot_score).toFixed(1)}/100</span>}
  </div>;
}

export function PlacePopularity({ place }: { place: PlacePopularityData }) {
  const [likeCount, setLikeCount] = useState(n(place.like_count));
  const [liked, setLiked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ranking, setRanking] = useState({
    rank: place.hot_rank ?? null,
    score: n(place.hot_score),
    breakdown: place.hot_breakdown ?? null as HotBreakdown | null,
  });
  const [rankingStale, setRankingStale] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/places/" + encodeURIComponent(place.id) + "/like", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("LOOKUP_FAILED"); return response.json(); })
      .then(payload => {
        setLiked(Boolean(payload.liked));
        setAuthenticated(Boolean(payload.authenticated));
        setLikeCount(n(payload.likeCount));
        setReady(true);
      })
      .catch(error => { if (error.name !== "AbortError") setMessage("Chưa tải được trạng thái yêu thích."); });
    return () => controller.abort();
  }, [place.id, place.like_count]);

  async function toggle() {
    if (!ready || busy) return;
    if (!authenticated) {
      const returnTo = "/dia-diem/" + encodeURIComponent(place.slug);
      window.location.assign("/api/auth/google/start?returnTo=" + encodeURIComponent(returnTo));
      return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/places/" + encodeURIComponent(place.id) + "/like",
        { method: liked ? "DELETE" : "PUT", cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        setMessage("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
        return;
      }
      if (!response.ok) throw new Error("MUTATION_FAILED");
      const payload = await response.json();
      setLiked(Boolean(payload.liked));
      const count = n(payload.likeCount);
      setLikeCount(count);
      // Calculate immediately, then fetch the public rank again because
      // changing one like may also shift other locations in the ranking.
      const metrics = { ...place, like_count: count };
      setRanking({ rank: null, score: hotScore(metrics), breakdown: hotBreakdown(metrics) });
      setRankingStale(true);
      try {
        const fresh = await fetch("/api/places/" + encodeURIComponent(place.slug) + "/detail",
          { cache: "no-store" });
        if (!fresh.ok) throw new Error("RANKING_UNAVAILABLE");
        const data = await fresh.json();
        if (!data.place) throw new Error("RANKING_UNAVAILABLE");
        setRanking({ rank: data.place.hot_rank ?? null, score: n(data.place.hot_score),
          breakdown: data.place.hot_breakdown ?? null });
        setRankingStale(false);
      } catch {
        setMessage("Đã lưu lượt tim. Tải lại trang để xem thứ hạng mới nhất.");
      }
    } catch {
      setMessage("Không cập nhật được lượt thích. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const b = ranking.breakdown;
  return <section className="place-popularity" aria-label="Mức độ yêu thích và điểm hot">
    <div className="place-popularity-numbers">
      <span title="Đánh giá đã duyệt"><Star size={16} aria-hidden="true"/> {n(place.rating_count) ? n(place.rating_avg).toFixed(1) + " (" + display(place.rating_count) + " đánh giá)" : "Chưa có đánh giá"}</span>
      <span title="Tổng lượt thích"><Heart size={16} aria-hidden="true"/> {display(likeCount)} tim</span>
      <span title="Tổng lượt xem"><Eye size={16} aria-hidden="true"/> {display(place.view_count)} xem</span>
    </div>
    <div className="place-popularity-controls">
      <button type="button" className={liked ? "liked" : ""} aria-pressed={liked} disabled={!ready || busy}
        onClick={toggle}><Heart size={16} fill={liked ? "currentColor" : "none"}/>
        {busy ? "Đang lưu…" : liked ? "Đã yêu thích" : "Thả tim"}
      </button>
      <div className="place-popularity-rank">
        {rankingStale ? <>Điểm tạm tính <strong>{ranking.score.toFixed(1)}/100</strong> · tải lại để xem Top</>
          : ranking.rank != null ? <>🔥 Top {ranking.rank} · <strong>{ranking.score.toFixed(1)}/100</strong></>
          : "Chưa có điểm xếp hạng"}
      </div>
    </div>
    {message && <p className="place-popularity-notice" role="status">{message}</p>}
    {!authenticated && ready && <p className="place-popularity-hint">Đăng nhập Google để thả tim. Mỗi tài khoản chỉ có một tim cho mỗi địa điểm.</p>}
    <details className="place-popularity-explain">
      <summary><Info size={15}/> Cách tính điểm hot (công khai)</summary>
      <dl>
        <div><dt>Đánh giá đã duyệt (40%)</dt><dd>{b ? b.ratings.toFixed(1) : "0,0"}/40</dd></div>
        <div><dt>Tim (35%)</dt><dd>{b ? b.likes.toFixed(1) : "0,0"}/35</dd></div>
        <div><dt>Xem 30 ngày (25%)</dt><dd>{b ? b.views.toFixed(1) : "0,0"}/25</dd></div>
      </dl>
      <p>{display(place.views_30d)} lượt xem hợp lệ trong 30 ngày gần nhất · {display(likeCount)} lượt tim đang có hiệu lực.</p>
      <p>Sao được điều chỉnh theo số lượng đánh giá (mốc 3,5 sao và 5 đánh giá). Tim theo logarit đến 200 tim; xem 30 ngày theo logarit đến 3.000 lượt. Điểm từng phần có giới hạn và làm tròn một chữ số thập phân. Không có vị trí trả phí hay ưu tiên Admin.</p>
    </details>
  </section>;
}
