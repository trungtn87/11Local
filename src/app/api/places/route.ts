import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" };

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug && !/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({error:"INVALID_SLUG"}, {status:400});
  }
  try {
    const sql = db();
    // The security-barrier view is the single visibility/moderation gate.
    const rows = slug
      ? await sql`SELECT visible.*, p.place_kind, p.summary, p.website_url,
                 p.featured_rank, p.featured_until,
                 p.navigation_latitude, p.navigation_longitude
                 FROM api.public_places visible
                 JOIN public.places p ON p.id=visible.id
                 WHERE visible.slug=${slug} LIMIT 1`
      : await sql`SELECT visible.*, p.place_kind, p.summary, p.website_url,
                 p.featured_rank, p.featured_until,
                 p.navigation_latitude, p.navigation_longitude
                 FROM api.public_places visible
                 JOIN public.places p ON p.id=visible.id
                 ORDER BY visible.updated_at DESC, visible.name LIMIT 500`;

    const ids = rows.map(row => String(row.id));
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
    const covers = new Map(photos.map(photo => [String(photo.place_id),String(photo.cover_photo_id)]));
    return NextResponse.json({ places: rows.map(row => ({
      ...row, cover_photo_id: covers.get(String(row.id)) ?? null,
    })) }, {headers});
  } catch (error) {
    console.error("11Local public places query failed", error);
    return NextResponse.json({error:"PLACES_UNAVAILABLE"}, {status:503});
  }
}
