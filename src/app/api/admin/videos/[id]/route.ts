import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

export async function PATCH(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!UUID.test(id)) return fail("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("INVALID_INPUT", 400);
  const { title, creatorName, visibility, isFeatured } = body;
  if (typeof title !== "string" || title.trim().length > 180 ||
    typeof creatorName !== "string" || creatorName.trim().length > 120 ||
    !["visible", "hidden"].includes(visibility) || typeof isFeatured !== "boolean") {
    return fail("INVALID_INPUT", 400);
  }
  try {
    const [video] = await db()`UPDATE public.place_video_reviews
      SET title=${title.trim()}, creator_name=${creatorName.trim()},
          visibility=${visibility}, is_featured=${isFeatured}, updated_at=now()
      WHERE id=${id} RETURNING *`;
    return video ? NextResponse.json({ video }) : fail("NOT_FOUND", 404);
  } catch (error) {
    console.error("Admin video update failed", error);
    return fail("VIDEO_SAVE_FAILED", 503);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!UUID.test(id)) return fail("NOT_FOUND", 404);
  try {
    const [deleted] = await db()`DELETE FROM public.place_video_reviews WHERE id=${id} RETURNING id`;
    return deleted ? NextResponse.json({ deleted: true }) : fail("NOT_FOUND", 404);
  } catch (error) {
    console.error("Admin video removal failed", error);
    return fail("VIDEO_DELETE_FAILED", 503);
  }
}
