import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/**
 * Read-only public detail. Joining through the allowlisted public view guarantees
 * moderation/visibility/category rules are identical to /api/places.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  }

  try {
    const sql = db();
    const [place] = await sql`
      SELECT visible.id, visible.slug, visible.name, visible.description,
        visible.address, visible.area, visible.latitude, visible.longitude,
        visible.category_id, visible.category_name, visible.ownership_status,
        visible.phone, p.opening_hours, p.price_note
      FROM api.public_places AS visible
      JOIN public.places AS p ON p.id = visible.id
      WHERE visible.slug = ${slug}
      LIMIT 1
    `;
    if (!place) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
    }

    const photos = await sql`
      SELECT ph.id, ph.photo_type
      FROM public.place_photos AS ph
      JOIN public.place_image_blobs AS blob ON blob.photo_id = ph.id
      WHERE ph.place_id = ${place.id}
        AND ph.moderation_status = 'approved'
        AND ph.photo_type IN ('cover', 'avatar', 'gallery')
      ORDER BY CASE ph.photo_type WHEN 'cover' THEN 0 WHEN 'avatar' THEN 1 ELSE 2 END,
        ph.created_at DESC, ph.id DESC
      LIMIT 24
    `;
    return NextResponse.json({
      place: {
        ...place,
        photos: photos.map((photo) => ({ id: photo.id, type: photo.photo_type })),
      },
    }, { headers: noStore });
  } catch (error) {
    console.error("11Local public place detail failed", error);
    return NextResponse.json({ error: "DETAIL_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}
