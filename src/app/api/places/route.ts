import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const baseFields = "id,slug,name,description,address,area,latitude,longitude,category_id,category_name,ownership_status,phone";
const discoveryFields = `${baseFields},updated_at,view_count,rating_avg,rating_count`;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug && !/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "INVALID_SLUG" }, { status: 400 });
  }

  try {
    const sql = db();
    let rows;
    try {
      rows = slug
        ? await sql`SELECT ${sql(discoveryFields.split(","))} FROM api.public_places WHERE slug=${slug} ORDER BY name LIMIT 1`
        : await sql`SELECT ${sql(discoveryFields.split(","))} FROM api.public_places ORDER BY updated_at DESC LIMIT 500`;
    } catch (error) {
      const databaseError = error as { code?: string };
      if (databaseError.code !== "42703") throw error;
      // Trước migration 0005: vẫn chỉ đọc security-barrier public view.
      rows = slug
        ? await sql`SELECT ${sql(baseFields.split(","))} FROM api.public_places WHERE slug=${slug} ORDER BY name LIMIT 1`
        : await sql`SELECT ${sql(baseFields.split(","))} FROM api.public_places ORDER BY name LIMIT 500`;
    }

    // A single approved cover per public place; no unmoderated images in public API.
    // Prefer the explicitly chosen cover over avatar or gallery photos.
    const placeIds = rows.map((place) => String(place.id));
    const photos = placeIds.length
      ? await sql`SELECT DISTINCT ON (ph.place_id) ph.place_id, ph.id AS cover_photo_id
          FROM place_photos ph
          JOIN place_image_blobs b ON b.photo_id = ph.id
          WHERE ph.place_id = ANY(${placeIds}::uuid[])
            AND ph.moderation_status = 'approved'
            AND ph.photo_type IN ('cover','avatar','gallery')
          ORDER BY ph.place_id,
            CASE ph.photo_type WHEN 'cover' THEN 0 WHEN 'avatar' THEN 1 ELSE 2 END,
            ph.created_at DESC, ph.id DESC`
      : [];
    const covers = new Map(photos.map((photo) => [String(photo.place_id), String(photo.cover_photo_id)]));
    const places = rows.map((place) => ({
      ...place,
      cover_photo_id: covers.get(String(place.id)) ?? null,
    }));

    return NextResponse.json({ places }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Neon public places query failed", error);
    return NextResponse.json({ error: "PLACES_UNAVAILABLE" }, { status: 503 });
  }
}
