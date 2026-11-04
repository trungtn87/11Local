import { cache } from "react";
import { db } from "@/lib/db";
import type { OpeningSlot, PlacePrice, PublicFact } from "@/features/places/public-place-format";

const SLUG = /^[a-z0-9][a-z0-9-]{0,127}$/;

export type PublishedPlaceDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  summary: string | null;
  address: string | null;
  area: string | null;
  latitude: number;
  longitude: number;
  navigation_latitude: number | null;
  navigation_longitude: number | null;
  category_id: string;
  category_name: string;
  ownership_status: string;
  place_kind: string;
  phone: string | null;
  website_url: string | null;
  opening_hours: string | null;
  price_note: string | null;
  view_count: number;
  rating_avg: number;
  rating_count: number;
  photos: Array<{ id: string; type: string; caption: string | null; alt: string | null }>;
  detail_fields: PublicFact[];
  opening_slots: OpeningSlot[];
  prices: PlacePrice[];
  tags: string[];
};

/**
 * Single visibility/moderation-gated read shared by the detail API, metadata,
 * and the public SSR page. React cache deduplicates metadata + page reads in
 * one request; it does not persist published data after Admin hides a place.
 */
export const getPublishedPlaceDetail = cache(async (slug: string): Promise<PublishedPlaceDetail | null> => {
  if (!SLUG.test(slug)) return null;

  const sql = db();
  const [place] = await sql`
    SELECT v.id,v.slug,v.name,v.description,v.address,v.area,v.latitude,v.longitude,
      v.category_id,v.category_name,v.ownership_status,v.phone,
      v.view_count,v.rating_avg,v.rating_count,
      p.place_kind,p.summary,p.website_url,p.featured_rank,p.featured_until,
      p.navigation_latitude,p.navigation_longitude,
      p.opening_hours,p.price_note
    FROM api.public_places v
    JOIN public.places p ON p.id=v.id
    WHERE v.slug=${slug} LIMIT 1`;
  if (!place) return null;

  const [photos, fields, hours, prices, tags] = await Promise.all([
    sql`SELECT ph.id,ph.photo_type,ph.caption,ph.alt_text
      FROM public.place_photos ph JOIN public.place_image_blobs blob ON blob.photo_id=ph.id
      WHERE ph.place_id=${place.id} AND ph.moderation_status='approved'
        AND ph.photo_type IN ('cover','avatar','gallery')
      ORDER BY CASE ph.photo_type WHEN 'cover' THEN 0 WHEN 'avatar' THEN 1 ELSE 2 END,
        ph.sort_order,ph.created_at DESC,ph.id DESC LIMIT 48`,
    sql`SELECT f.label,f.field_type,d.details -> f.field_key AS value
      FROM public.place_details d
      JOIN public.category_fields f ON f.category_id=${place.category_id} AND f.is_visible=true
      WHERE d.place_id=${place.id} AND d.details ? f.field_key
      ORDER BY f.sort_order,f.field_key LIMIT 80`,
    sql`SELECT day_of_week,slot_index,opens_at,closes_at,is_closed,is_24_hours
      FROM public.place_opening_hours WHERE place_id=${place.id}
      ORDER BY day_of_week,slot_index LIMIT 40`,
    sql`SELECT label,amount_min,amount_max,currency,unit,note
      FROM public.place_prices WHERE place_id=${place.id} AND is_active=true
      ORDER BY sort_order,created_at,id LIMIT 40`,
    sql`SELECT t.name
      FROM public.place_tags pt JOIN public.tags t ON t.id=pt.tag_id
      WHERE pt.place_id=${place.id} ORDER BY t.name LIMIT 40`,
  ]);

  // Serialize Date/other driver-specific values before crossing the
  // server/client boundary. Never include private moderation fields.
  return JSON.parse(JSON.stringify({
    ...place,
    photos: photos.map((p) => ({
      id: p.id, type: p.photo_type, caption: p.caption, alt: p.alt_text,
    })),
    detail_fields: fields,
    opening_slots: hours,
    prices,
    tags: tags.map((tag) => String(tag.name)),
  })) as PublishedPlaceDetail;
});

export async function getPublishedSitemapEntries() {
  // Do not derive from the home page's 500-place limit.
  const rows = await db()`
    SELECT slug, updated_at FROM api.public_places ORDER BY slug
  `;
  return rows.map((row) => ({
    slug: String(row.slug),
    updatedAt: row.updated_at ? new Date(row.updated_at as string | number | Date) : null,
  }));
}
