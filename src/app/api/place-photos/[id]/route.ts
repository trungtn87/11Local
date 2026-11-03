import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    // Only published images of published, visible places may leave Neon.
    const [photo] = await db()`SELECT b.mime_type, b.contents
      FROM place_photos ph
      JOIN places p ON p.id = ph.place_id
      JOIN place_image_blobs b ON b.photo_id = ph.id
      WHERE ph.id = ${id}
        AND ph.moderation_status = 'approved'
        AND p.moderation_status = 'approved'
        AND p.visibility = 'visible'
      LIMIT 1`;

    if (!photo) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return new NextResponse(photo.contents, {
      headers: {
        "Content-Type": photo.mime_type,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Public place photo query failed", error);
    return NextResponse.json({ error: "PHOTO_UNAVAILABLE" }, { status: 503 });
  }
}
