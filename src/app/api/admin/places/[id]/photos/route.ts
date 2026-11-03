import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

const MAX_INPUT = 10 * 1024 * 1024;
const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  if (!await isAdmin()) return unauthorized();
  const { id } = await params;
  try {
    const photos = await db()`SELECT id, photo_type, moderation_status, created_at
      FROM place_photos WHERE place_id = ${id}
      ORDER BY CASE WHEN photo_type = 'cover' THEN 0 ELSE 1 END, created_at DESC`;
    return NextResponse.json({ photos }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "PHOTOS_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Context) {
  if (!await isAdmin()) return unauthorized();
  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/") || !file.size || file.size > MAX_INPUT) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  let contents: Buffer;
  try {
    contents = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (!contents.length) throw new Error("Empty image");
  } catch {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  const sql = db();
  const photoId = randomUUID();
  try {
    const photo = await sql.begin(async (tx) => {
      const [place] = await tx`SELECT id FROM places WHERE id = ${id} FOR UPDATE`;
      if (!place) return null;
      const [currentCover] = await tx`SELECT id FROM place_photos
        WHERE place_id = ${id} AND photo_type = 'cover' LIMIT 1`;
      const kind = currentCover ? "gallery" : "cover";
      // An upload from authenticated Admin is approved; first photo becomes cover.
      await tx`INSERT INTO place_photos (id, place_id, object_key, source, photo_type, moderation_status)
        VALUES (${photoId}, ${id}, ${"neon:" + photoId}, 'admin', ${kind}, 'approved')`;
      await tx`INSERT INTO place_image_blobs (photo_id, mime_type, contents)
        VALUES (${photoId}, 'image/webp', ${contents})`;
      await tx`UPDATE places SET updated_at = now() WHERE id = ${id}`;
      return { id: photoId, cover: kind === "cover", bytes: contents.length, mimeType: "image/webp" };
    });
    if (!photo) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Admin place photo upload failed", error);
    return NextResponse.json({ error: "PHOTO_UPLOAD_FAILED" }, { status: 500 });
  }
}
