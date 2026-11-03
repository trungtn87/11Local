export type PublicPlace = {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  area: string;
  latitude: number;
  longitude: number;
  category_id: string;
  category_name: string;
  ownership_status: string;
  phone: string | null;
  updated_at?: string;
  featured_order?: number | null;
  view_count?: number;
  rating_avg?: number;
  rating_count?: number;
};

function hotScore(place: PublicPlace) {
  const views = Math.max(0, Number(place.view_count) || 0);
  const rating = Math.max(0, Number(place.rating_avg) || 0);
  const ratingCount = Math.max(0, Number(place.rating_count) || 0);
  const confidence = Math.min(1, ratingCount / 5);
  return Math.log1p(views) * Math.max(1, rating) + rating * confidence;
}

export function selectHotPlaces(places: PublicPlace[], limit = 6) {
  const hasViewData = places.some((place) => Number(place.view_count) > 0);
  return [...places]
    .sort((a, b) => {
      if (hasViewData) return hotScore(b) - hotScore(a) || Number(b.rating_count || 0) - Number(a.rating_count || 0);
      // Neon cũ chưa có metrics: fallback rõ ràng sang rating có trọng số số lượt.
      return (
        Number(b.rating_avg || 0) * Math.min(1, Number(b.rating_count || 0) / 5) -
          Number(a.rating_avg || 0) * Math.min(1, Number(a.rating_count || 0) / 5) ||
        Date.parse(b.updated_at || "") - Date.parse(a.updated_at || "")
      );
    })
    .slice(0, limit);
}

export function selectExplorePlaces(places: PublicPlace[], limit = 6) {
  const featured = places
    .filter((place) => place.featured_order != null)
    .sort((a, b) => Number(a.featured_order) - Number(b.featured_order));
  const fallback = places
    .filter((place) => place.featured_order == null)
    .sort(
      (a, b) =>
        Date.parse(b.updated_at || "") - Date.parse(a.updated_at || "") ||
        Number(b.rating_avg || 0) - Number(a.rating_avg || 0),
    );
  return [...featured, ...fallback].slice(0, limit);
}
