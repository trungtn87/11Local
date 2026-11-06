/**
 * Public 11Local Hot Score V1. Every displayed component and its inputs are
 * visible to visitors. No paid or Admin-curated position affects this score.
 *
 * R: approved average shrunk toward 3.5 stars by five prior reviews.
 * H: log-scaled live likes, reaching 100 points at 200 likes.
 * V: log-scaled valid place detail views over the last 30 Vietnam-local days,
 *    reaching 100 points at 3,000 views.
 */
export type HotMetrics = {
  id: string;
  name?: string;
  rating_avg?: number | string | null;
  rating_count?: number | string | null;
  like_count?: number | string | null;
  view_count?: number | string | null;
  views_30d?: number | string | null;
};

export type HotBreakdown = { ratings: number; likes: number; views: number };
export type HotRankFields = {
  hot_score: number;
  hot_rank: number | null;
  hot_breakdown: HotBreakdown;
};

const count = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round = (n: number) => Math.round(n * 10) / 10;
const logarithmic = (value: number, cap: number) =>
  Math.min(100, Math.log1p(value) / Math.log1p(cap) * 100);

export function hotBreakdown(place: HotMetrics): HotBreakdown {
  const reviews = count(place.rating_count);
  const avg = Math.min(5, count(place.rating_avg));
  const ratingScore = reviews ? ((avg * reviews + 3.5 * 5) / (reviews + 5)) / 5 * 100 : 0;
  return {
    ratings: round(ratingScore * 0.40),
    likes: round(logarithmic(count(place.like_count), 200) * 0.35),
    views: round(logarithmic(count(place.views_30d), 3000) * 0.25),
  };
}

export function hotScore(place: HotMetrics) {
  const b = hotBreakdown(place);
  return round(b.ratings + b.likes + b.views);
}

export function hasHotActivity(place: HotMetrics) {
  return count(place.rating_count) > 0 || count(place.like_count) > 0 || count(place.views_30d) > 0;
}

/** Rank the COMPLETE public catalogue, before any home/search list limit. */
export function rankPublicPlaces<T extends HotMetrics>(places: T[]): Array<T & HotRankFields> {
  const rows = places.map(place => {
    const hot_breakdown = hotBreakdown(place);
    return { ...place, hot_breakdown,
      hot_score: round(hot_breakdown.ratings + hot_breakdown.likes + hot_breakdown.views),
      hot_rank: null as number | null };
  });
  const ranked = rows.filter(hasHotActivity).sort((a, b) =>
    b.hot_score - a.hot_score
    || count(b.like_count) - count(a.like_count)
    || count(b.rating_count) - count(a.rating_count)
    || count(b.views_30d) - count(a.views_30d)
    || String(a.name ?? a.id).localeCompare(String(b.name ?? b.id), "vi")
    || String(a.id).localeCompare(String(b.id))
  );
  ranked.forEach((p, i) => { p.hot_rank = i + 1; });
  return rows;
}
