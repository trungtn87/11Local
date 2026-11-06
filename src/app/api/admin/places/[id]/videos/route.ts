import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { parsePlaceVideoLink } from "@/lib/place-video-links";

type Context = { params: Promise<{ id: string }> };
const noStore = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore });
const UUID = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!UUID.test(id)) return fail("NOT_FOUND", 404);
  try {
    const rows = await db()`SELECT id, place_id, provider, source_url, title, creator_name,
      is_featured, visibility, moderation_status, source, decision_note, created_at
      FROM public.place_video_reviews WHERE place_id=${id}
      ORDER BY is_featured DESC, created_at DESC LIMIT 120`;
    return NextResponse.json({ videos: rows }, { headers: noStore });
  } catch (error) {
    console.error("Admin video list failed", error);
    return fail("VIDEOS_UNAVAILABLE", 503);
  }
}

export async function POST(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!UUID.test(id)) return fail("NOT_FOUND", 404);
  let data: { link: ReturnType<typeof parsePlaceVideoLink>; title: string; creatorName: string };
  try {
    const body = await request.json();
    const link = parsePlaceVideoLink(body?.url);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const creatorName = typeof body?.creatorName === "string" ? body.creatorName.trim() : "";
    if (title.length > 180 || creatorName.length > 120) throw new Error("INVALID_VIDEO_DETAILS");
    data = { link, title, creatorName };
  } catch (e) { return fail(e instanceof Error ? e.message : "INVALID_INPUT", 400); }
  try {
    const sql = db();
    const row = await sql.begin(async tx => {
      const [place] = await tx`SELECT id FROM public.places WHERE id=${id} FOR SHARE`;
      if (!place) throw new Error("NOT_FOUND");
      const [inserted] = await tx`INSERT INTO public.place_video_reviews
        (place_id, provider, source_url, normalized_key, title, creator_name)
        VALUES (${id}, ${data.link.provider}, ${data.link.sourceUrl}, ${data.link.normalizedKey},
          ${data.title}, ${data.creatorName}) RETURNING *`;
      return inserted;
    });
    return NextResponse.json({ video: row }, { status: 201, headers: noStore });
  } catch (e) {
    if ((e as Error).message === "NOT_FOUND") return fail("NOT_FOUND", 404);
    if ((e as { code?: string }).code === "23505") return fail("VIDEO_EXISTS", 409);
    console.error("Admin video create failed", e);
    return fail("VIDEO_SAVE_FAILED", 503);
  }
}
