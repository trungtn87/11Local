import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import { isReviewUuid, parseReviewEdit } from "@/lib/review-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function PATCH(request: Request, { params }: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("INVALID_ORIGIN", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 6000) return fail("REQUEST_TOO_LARGE", 413);
  const user = await getCurrentUser();
  if (!user || !isReviewUuid(user.id)) return fail("LOGIN_REQUIRED", 401);
  const { id } = await params;
  if (!isReviewUuid(id)) return fail("NOT_FOUND", 404);
  let input: ReturnType<typeof parseReviewEdit>;
  try { input = parseReviewEdit(await request.json()); }
  catch (error) {
    return fail(error instanceof Error && error.message.startsWith("INVALID_")
      ? error.message : "INVALID_INPUT", 400);
  }

  try {
    const result = await db().begin(async tx => {
      const [review] = await tx`SELECT r.* FROM public.reviews r
        JOIN public.users u ON u.id=r.user_id AND u.google_sub IS NOT NULL
        WHERE r.id=${id} AND r.user_id=${user.id} FOR UPDATE OF r`;
      if (!review || review.deleted_at) throw new Error("NOT_FOUND");
      if (Number(review.version) !== input.expectedVersion) throw new Error("STALE_VERSION");
      const [place] = await tx`SELECT id FROM api.public_places WHERE id=${review.place_id} LIMIT 1`;
      if (!place) throw new Error("PLACE_NOT_FOUND");
      const [limit] = await tx`INSERT INTO public.review_submission_limits(user_id,window_start,attempts)
        VALUES (${user.id},now(),1)
        ON CONFLICT(user_id) DO UPDATE SET
          attempts=CASE WHEN review_submission_limits.window_start < now()-interval '24 hours'
            THEN 1 ELSE review_submission_limits.attempts+1 END,
          window_start=CASE WHEN review_submission_limits.window_start < now()-interval '24 hours'
            THEN now() ELSE review_submission_limits.window_start END
        RETURNING attempts`;
      if (Number(limit.attempts) > 10) throw new Error("RATE_LIMITED");

      // Every change replaces the previous pending edit; the public approved
      // snapshot remains unchanged until Admin explicitly approves this revision.
      await tx`UPDATE public.review_revisions SET status='superseded'
        WHERE review_id=${id} AND status='pending'`;
      let revisionId: string | null = null;
      let status = "pending";
      if (review.moderation_status === "approved") {
        const [revision] = await tx`INSERT INTO public.review_revisions(review_id,stars,content)
          VALUES (${id},${input.stars},${input.content}) RETURNING id`;
        revisionId = String(revision.id);
        status = "approved";
        await tx`UPDATE public.reviews SET version=version+1,updated_at=now() WHERE id=${id}`;
      } else {
        await tx`UPDATE public.reviews SET stars=${input.stars},content=${input.content},
          moderation_status='pending',reviewed_at=NULL,decision_note=NULL,
          updated_at=now(),version=version+1 WHERE id=${id}`;
      }
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,before_data,after_data)
        VALUES (${user.id},'review',${id},'edited','Google user edited rating',
          ${tx.json({ status: review.moderation_status, version: review.version })},
          ${tx.json({ status, stars: input.stars, pendingRevisionId: revisionId })})`;
      return { id, status, pendingRevisionId: revisionId, version: Number(review.version) + 1 };
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    const code = (error as Error).message;
    if (code === "NOT_FOUND" || code === "PLACE_NOT_FOUND") return fail(code, 404);
    if (code === "STALE_VERSION") return fail(code, 409);
    if (code === "RATE_LIMITED") return fail(code, 429);
    console.error("11Local review edit failed", error);
    return fail("REVIEW_UNAVAILABLE", 503);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("INVALID_ORIGIN", 403);
  const user = await getCurrentUser();
  if (!user || !isReviewUuid(user.id)) return fail("LOGIN_REQUIRED", 401);
  const { id } = await params;
  if (!isReviewUuid(id)) return fail("NOT_FOUND", 404);
  try {
    await db().begin(async tx => {
      const [review] = await tx`SELECT r.id, r.moderation_status, r.deleted_at,
          r.version FROM public.reviews r
        JOIN public.users u ON u.id=r.user_id AND u.google_sub IS NOT NULL
        WHERE r.id=${id} AND r.user_id=${user.id} FOR UPDATE OF r`;
      if (!review || review.deleted_at) throw new Error("NOT_FOUND");
      await tx`UPDATE public.review_revisions SET status='superseded'
        WHERE review_id=${id} AND status='pending'`;
      // Preserve the row/unique(place_id,user_id), but remove it from the
      // existing published rating view immediately.
      await tx`UPDATE public.reviews SET deleted_at=now(),moderation_status='rejected',
        updated_at=now(),version=version+1 WHERE id=${id}`;
      await tx`INSERT INTO public.moderation_logs
        (actor_user_id,entity_type,entity_id,action,reason,before_data,after_data)
        VALUES (${user.id},'review',${id},'deleted','Google user removed rating',
          ${tx.json({ status: review.moderation_status, version: review.version })},
          ${tx.json({ status: "rejected", deleted: true })})`;
    });
    return NextResponse.json({ deleted: true }, { headers });
  } catch (error) {
    if ((error as Error).message === "NOT_FOUND") return fail("NOT_FOUND", 404);
    console.error("11Local review deletion failed", error);
    return fail("REVIEW_UNAVAILABLE", 503);
  }
}
