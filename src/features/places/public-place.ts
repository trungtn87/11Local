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
};

function asTime(date?: string) {
  const n = date ? Date.parse(date) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function activeFeature(p: PublicPlace, now: number) {
  return p.featured_rank != null && Number(p.featured_rank) > 0
    && (!p.featured_until || asTime(p.featured_until) > now);
}
function hotScore(place: PublicPlace) {
  const views = Math.max(0, Number(place.view_count) || 0);
  const rating = Math.max(0, Number(place.rating_avg) || 0);
  const reviews = Math.max(0, Number(place.rating_count) || 0);
  return Math.log1p(views) * Math.max(1, rating) + rating * Math.min(1, reviews / 5);
}
/** No simulated hot entries: require real views or approved reviews. */
export function selectHotPlaces(places: PublicPlace[], limit = 6) {
  return [...places]
    .filter(p => Number(p.view_count) > 0 || Number(p.rating_count) > 0)
    .sort((a, b) => hotScore(b) - hotScore(a)
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
