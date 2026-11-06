import { hotScore, hasHotActivity } from "./hot-ranking.ts";

export type PublicPlace = {
  id: string; slug: string; name: string; description: string;
  summary?: string; address: string; area: string;
  latitude: number; longitude: number;
  navigation_latitude?: number | null; navigation_longitude?: number | null;
  category_id: string; category_name: string; category_icon?: string | null; place_kind?: "business" | "attraction" | "public_place";
  ownership_status: string; phone: string | null;
  website_url?: string | null; updated_at?: string;
  featured_rank?: number | null; featured_until?: string | null;
  view_count?: number; rating_avg?: number; rating_count?: number;
  like_count?: number; views_30d?: number; hot_score?: number; hot_rank?: number | null;
};

function asTime(date?: string) {
  const n = date ? Date.parse(date) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function activeFeature(p: PublicPlace, now: number) {
  return p.featured_rank != null && Number(p.featured_rank) > 0
    && (!p.featured_until || asTime(p.featured_until) > now);
}
/** No simulated hot entries: require real views or approved reviews. */
export function selectHotPlaces(places: PublicPlace[], limit = 6) {
  return [...places]
    .filter(hasHotActivity)
    .sort((a, b) => (a.hot_rank != null && b.hot_rank != null
      ? a.hot_rank - b.hot_rank : hotScore(b) - hotScore(a))
      || Number(b.like_count || 0) - Number(a.like_count || 0)
      || Number(b.rating_count || 0) - Number(a.rating_count || 0)
      || asTime(b.updated_at) - asTime(a.updated_at)
      || a.name.localeCompare(b.name, "vi"))
    .slice(0, limit);
}
/** Manually ranked current features first; remaining results by actual last update. */
export function selectExplorePlaces(places: PublicPlace[], limit = 6, now = Date.now()) {
  return [...places].sort((a, b) => {
    const ax = activeFeature(a, now), bx = activeFeature(b, now);
    if (ax !== bx) return ax ? -1 : 1;
    if (ax && bx) return Number(a.featured_rank) - Number(b.featured_rank);
    return asTime(b.updated_at) - asTime(a.updated_at) || a.name.localeCompare(b.name,"vi");
  }).slice(0, limit);
}
