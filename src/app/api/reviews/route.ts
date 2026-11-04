import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import { isReviewUuid, parseReviewInput, parseReviewPagination } from "@/lib/review-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const placeId = params.get("placeId");
  if (!isReviewUuid(placeId)) return fail("INVALID_PLACE", 400);
  let paging: ReturnType<typeof parseReviewPagination>;
  try { paging = parseReviewPagination(params); }
  catch { return fail("INVALID_PAGINATION", 400); }

  try {
    const sql = db();
    // Public view is the single visibility and category gate. Never leak hidden places.
    const [place] = await sql`SELECT id, rating_avg, rating_count
      FROM api.public_places WHERE id=${placeId} LIMIT 1`;
    if (!place) return fail("PLACE_NOT_FOUND", 404);

    const [reviews, distribution] = await Promise.all([
      sql`SELECT r.id, r.stars, r.content, r.created_at, r.updated_at,
          u.display_name AS author_name, u.avatar_url AS author_avatar
        FROM public.reviews r JOIN public.users u ON u.id=r.user_id
        WHERE r.place_id=${placeId} AND r.moderation_status='approved'
          AND r.deleted_at IS NULL
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ${paging.limit} OFFSET ${paging.offset}`,
      sql`SELECT stars, count(*)::int AS count FROM public.reviews
        WHERE place_id=${placeId} AND moderation_status='approved'
          AND deleted_at IS NULL GROUP BY stars ORDER BY stars DESC`,
    ]);

    const user = await getCurrentUser();
    let mine = null;
    if (user && isReviewUuid(user.id)) {
      const [own] = await sql`SELECT r.id, r.stars, r.content, r.moderation_status AS status,
          r.deleted_at, r.created_at, r.updated_at, r.version, r.decision_note,
          rev.id AS pending_revision_id, rev.stars AS pending_stars,
          rev.content AS pending_content
        FROM public.reviews r
        LEFT JOIN public.review_revisions rev
          ON rev.review_id=r.id AND rev.status='pending'
        WHERE r.place_id=${placeId} AND r.user_id=${user.id} LIMIT 1`;
      mine = own ?? null;
    }
    return NextResponse.json({
      reviews, page: paging.page, limit: paging.limit,
      ratingAvg: Number(place.rating_avg), ratingCount: Number(place.rating_count),
      distribution, mine,
    }, { headers });
  } catch (error) {
    console.error("11Local reviews lookup failed", error);
    return fail("REVIEWS_UNAVAILABLE", 503);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("INVALID_ORIGIN", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 6000) return fail("REQUEST_TOO_LARGE", 413);
  const user = await getCurrentUser();
  if (!user || !isReviewUuid(user.id)) return fail("LOGIN_REQUIRED", 401);
  let input: ReturnType<typeof parseReviewInput>;
  let placeId: string;
  try {
    const body = await request.json() as Record<string, unknown>;
    input = parseReviewInput(body);
    if (!isReviewUuid(body.placeId)) throw new Error("INVALID_PLACE");
    placeId = body.placeId;
  } catch (error) {
    return fail(error instanceof Error && error.message.startsWith("INVALID_")
      ? error.message : "INVALID_INPUT", 400);
  }

  try {
    const result = await db().begin(async tx => {
      // A signed session alone is insufficient: account must still be linked to Google.
      const [account] = await tx`SELECT id FROM public.users
        WHERE id=${user.id} AND google_sub IS NOT NULL LIMIT 1`;
      if (!account) throw new Error("LOGIN_REQUIRED");
      const [place] = await tx`SELECT id FROM api.public_places WHERE id=${placeId} LIMIT 1`;
      if (!place) throw new Error("PLACE_NOT_FOUND");
      const [existing] = await tx`SELECT id, deleted_at, version FROM public.reviews
        WHERE place_id=${placeId} AND user_id=${user.id} FOR UPDATE`;
      if (existing && !existing.deleted_at) throw new Error("REVIEW_EXISTS");

      const [limit] = await tx`INSERT INTO public.review_submission_limits(user_id,window_start,attempts)
        VALUES (${user.id},now(),1)
        ON CONFLICT(user_id) DO UPDATE SET
          attempts=CASE WHEN review_submission_limits.window_start < now()-interval '24 hours'
            THEN 1 ELSE review_submission_limits.attempts+1 END,
          window_start=CASE WHEN review_submission_limits.window_start < now()-interval '24 hours'
            THEN now() ELSE review_submission_limits.window_start END
        RETURNING attempts`;
      if (Number(limit.attempts) > 10) throw new Error("RATE_LIMITED");

      const [review] = existing
        ? await tx`UPDATE public.reviews SET stars=${input.stars},content=${input.content},
            moderation_status='pending',deleted_at=NULL,reviewed_at=NULL,
            decision_note=NULL,updated_at=now(),version=version+1
          WHERE id=${existing.id} RETURNING id,version`
        : await tx`INSERT INTO public.reviews(place_id,user_id,stars,content)
          VALUES (${placeId},${user.id},${input.stars},${input.content})
          RETURNING id,version`;
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,after_data)
        VALUES (${user.id},'review',${review.id},'submitted',
          'Google user submitted rating',${tx.json({ placeId, stars: input.stars, status: "pending" })})`;
      return { id: review.id, version: Number(review.version), status: "pending" };
    });
    return NextResponse.json(result, { status: 201, headers });
  } catch (error) {
    const code = (error as Error).message;
    if (code === "LOGIN_REQUIRED") return fail(code, 401);
    if (code === "PLACE_NOT_FOUND") return fail(code, 404);
    if (code === "REVIEW_EXISTS" || (error as { code?: string }).code === "23505")
      return fail("REVIEW_EXISTS", 409);
    if (code === "RATE_LIMITED") return fail(code, 429);
    console.error("11Local review submission failed", error);
    return fail("REVIEW_UNAVAILABLE", 503);
  }
}
