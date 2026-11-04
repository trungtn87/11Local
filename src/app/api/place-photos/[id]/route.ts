import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { photoPreset } from "@/lib/photo-variants";

export const dynamic = "force-dynamic";

const PHOTO_CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";
const OPTIMIZABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const MAX_TRANSFORM_INPUT_BYTES = 20 * 1024 * 1024;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const preset = photoPreset(new URL(request.url).searchParams.get("size"));
  if (preset === undefined) {
    return NextResponse.json({ error: "INVALID_PHOTO_SIZE" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Preserve the moderation gate for every variant and original URL.
    // A previously approved photo is not enough if its place was hidden.
    const [photo] = await db()`SELECT b.mime_type, b.contents
      FROM place_photos ph
      JOIN places p ON p.id = ph.place_id
      JOIN place_image_blobs b ON b.photo_id = ph.id
      WHERE ph.id = ${id}
        AND ph.moderation_status = 'approved'
        AND p.moderation_status = 'approved'
        AND p.visibility = 'visible'
      LIMIT 1`;

    if (!photo) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const original = Buffer.from(photo.contents);
    let output = original;
    let mime = String(photo.mime_type);

    if (preset && OPTIMIZABLE.has(mime) && original.length <= MAX_TRANSFORM_INPUT_BYTES) {
      try {
        // Effort 1 avoids expensive encoding bursts on a 1-vCPU VPS.
        // Decode safeguards cap memory even for unusually large uploads.
        output = await sharp(original, { limitInputPixels: 35_000_000, sequentialRead: true })
          .rotate()
          .resize(preset.width, preset.height, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 76, effort: 1 })
          .toBuffer();
        mime = "image/webp";
      } catch (error) {
        // Keep the original image available if legacy input cannot be resized.
        // No fabricated image or unapproved data is exposed.
        console.error("Public place photo resize skipped", error);
      }
    }

    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": PHOTO_CACHE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Public place photo query failed", error);
    return NextResponse.json({ error: "PHOTO_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
