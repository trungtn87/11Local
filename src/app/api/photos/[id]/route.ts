import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import { isAdmin } from "@/lib/admin-auth";
import { matchesPhotoEtag, photoEtag } from "@/lib/photo-http-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return missing();

  const sql = db();
  // Read metadata first. On a repeated image request we can return HTTP 304
  // without reading the potentially large image bytea column from Neon.
  const rows = await sql.unsafe(
    `SELECT p.mime, p.status, p.uploaded_by::text, p.created_at::text,
      a.archived_at FROM family_photos p
      JOIN family_albums a ON a.id=p.album_id WHERE p.id::text=$1`,
    [id],
  );
  if (!rows.length) return missing();
  const photo = rows[0];
  const isPublic = photo.status === "approved" && !photo.archived_at;
  if (!isPublic) {
    const user = await getCurrentUser();
    if (!(await isAdmin()) && user?.id !== photo.uploaded_by) return missing();
  }

  const headers: Record<string, string> = {
    "Content-Type": String(photo.mime),
    "X-Content-Type-Options": "nosniff",
    // Browsers may retain the public bytes, but must revalidate before reuse.
    // This avoids serving deleted/archived family photos from a stale cache.
    "Cache-Control": isPublic ? "private, no-cache, must-revalidate" : "no-store",
  };
  if (isPublic) {
    const etag = photoEtag(id, String(photo.created_at));
    headers.ETag = etag;
    if (matchesPhotoEtag(request.headers.get("if-none-match"), etag)) {
      return new Response(null, { status: 304, headers });
    }
  }

  // Re-check public status when fetching bytes to avoid a concurrent
  // archive/unpublish returning an image after its metadata was checked.
  const content = await sql.unsafe(
    `SELECT p.content FROM family_photos p
      JOIN family_albums a ON a.id=p.album_id
      WHERE p.id::text=$1${isPublic ? " AND p.status='approved' AND a.archived_at IS NULL" : ""}`,
    [id],
  );
  if (!content.length) return missing();
  return new NextResponse(new Uint8Array(content[0].content as Buffer), { headers });
}
