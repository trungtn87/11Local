import { db } from "@/lib/db";
import { rankPublicPlaces } from "@/features/places/hot-ranking";

/**
 * The public security-barrier view is the single moderation/visibility gate.
 * Server pages and /api/places must use the same query so crawlers and users
 * never receive unpublished places.
 */
export async function getPublicPlaces(slug?: string) {
  const sql = db();
  // Hot ranking uses the COMPLETE published catalog, not a newest-500 slice.
  const rows = await sql`SELECT visible.*, c.icon AS category_icon, p.place_kind, p.summary, p.website_url,
                 p.featured_rank, p.featured_until,
                 p.navigation_latitude, p.navigation_longitude
                 FROM api.public_places visible
                 JOIN public.places p ON p.id=visible.id
                 LEFT JOIN public.categories c ON c.id=visible.category_id
                 ORDER BY visible.updated_at DESC, visible.name`;

  const ids = rows.map((row) => String(row.id));
  const photos = ids.length
    ? await sql`SELECT DISTINCT ON (ph.place_id) ph.place_id, ph.id AS cover_photo_id
        FROM public.place_photos ph
        JOIN public.place_image_blobs b ON b.photo_id=ph.id
        WHERE ph.place_id=ANY(${ids}::uuid[]) AND ph.moderation_status='approved'
          AND ph.photo_type IN ('cover','avatar','gallery')
        ORDER BY ph.place_id,
          CASE ph.photo_type WHEN 'cover' THEN 0 WHEN 'avatar' THEN 1 ELSE 2 END,
          ph.created_at DESC, ph.id DESC`
    : [];

  const covers = new Map(photos.map((photo) => [String(photo.place_id), String(photo.cover_photo_id)]));
  // Serialize Postgres values at the React Server Component boundary.
  const ranked = rankPublicPlaces(rows.map((row) => ({
    ...row, id: String(row.id), name: String(row.name),
    rating_avg: Number(row.rating_avg), rating_count: Number(row.rating_count),
    like_count: Number(row.like_count), views_30d: Number(row.views_30d),
    view_count: Number(row.view_count),
    cover_photo_id: covers.get(String(row.id)) ?? null,
  })));
  return JSON.parse(JSON.stringify(slug
    ? ranked.filter(row => row.slug === slug) : ranked)) as Record<string, unknown>[];
}

async function getPublicCategories() {
  return db()`SELECT id, name, icon, sort_order
              FROM categories WHERE visibility = 'visible'
              ORDER BY sort_order, name`;
}

export async function getPublicBootstrap() {
  // Synchronous configuration failures must also become rejected promises.
  // Public pages never fall back to fabricated data.
  const [placesResult, categoriesResult] = await Promise.allSettled([
    getPublicPlaces(),
    getPublicCategories(),
  ]);
  if (placesResult.status === "rejected") {
    console.error("11Local SSR places query failed", placesResult.reason);
  }
  if (categoriesResult.status === "rejected") {
    console.error("11Local SSR categories query failed", categoriesResult.reason);
  }
  const categories = categoriesResult.status === "fulfilled"
    ? categoriesResult.value.map((row) => ({
        id: row.id,
        label: row.name,
        icon: row.icon,
        sortOrder: row.sort_order,
        enabled: true,
      }))
    : [];
  return {
    initialPlaces: placesResult.status === "fulfilled" ? placesResult.value : [],
    initialPlacesState: placesResult.status === "fulfilled" ? "ready" as const : "error" as const,
    initialCategories: JSON.parse(JSON.stringify(categories)) as Record<string, unknown>[],
    initialCategoriesState: categoriesResult.status === "fulfilled" ? "ready" as const : "error" as const,
  };
}
