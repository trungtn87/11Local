import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/contribution-review";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: {
  params: Promise<{ id: string; photoId: string }>
}) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id, photoId } = await params;
  if (!isUuid(id) || !isUuid(photoId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const [photo] = await db()`SELECT mime_type, contents FROM public.contribution_photos
      WHERE contribution_id=${id} AND id=${photoId} LIMIT 1`;
    if (!photo) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return new NextResponse(photo.contents, { headers: {
      "Content-Type": String(photo.mime_type), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch (error) {
    console.error("Admin staged photo failed", error);
    return NextResponse.json({ error: "PHOTO_UNAVAILABLE" }, { status: 503 });
  }
}
