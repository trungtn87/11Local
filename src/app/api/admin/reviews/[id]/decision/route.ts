import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isReviewUuid, parseReviewDecision } from "@/lib/review-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function POST(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("INVALID_ORIGIN", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 6000) return fail("REQUEST_TOO_LARGE", 413);
  const { id } = await params;
  if (!isReviewUuid(id)) return fail("NOT_FOUND", 404);
  let decision: ReturnType<typeof parseReviewDecision>;
  try { decision = parseReviewDecision(await request.json()); }
  catch (error) {
    return fail(error instanceof Error && (
      error.message.startsWith("INVALID_") || error.message === "REASON_REQUIRED"
    ) ? error.message : "INVALID_INPUT", 400);
  }
  try {
    const result = await db().begin(async tx => {
      // Serialize Admin decisions with owner edits and deletion.
      const [review] = await tx`SELECT id, stars, content, moderation_status, deleted_at, version
        FROM public.reviews WHERE id=${id} FOR UPDATE`;
      if (!review || review.deleted_at) throw new Error("NOT_FOUND");
      if (Number(review.version) !== decision.expectedVersion) throw new Error("STALE_VERSION");
      const reason = decision.note || "Admin approved 11Local review";
      let status: string;
      if (decision.revisionId) {
        if (review.moderation_status !== "approved") throw new Error("INVALID_STATE");
        const [revision] = await tx`SELECT id, stars, content FROM public.review_revisions
          WHERE id=${decision.revisionId} AND review_id=${id} AND status='pending'
          FOR UPDATE`;
        if (!revision) throw new Error("ALREADY_REVIEWED");
        status = decision.action === "approve" ? "approved" : "rejected";
        await tx`UPDATE public.review_revisions SET status=${status},
          decision_note=${decision.note || null},reviewed_at=now()
          WHERE id=${revision.id}`;
        if (status === "approved") {
          await tx`UPDATE public.reviews
            SET stars=${revision.stars},content=${revision.content},
              reviewed_at=now(),decision_note=${decision.note || null},
              version=version+1,updated_at=now()
            WHERE id=${id}`;
        } else {
          await tx`UPDATE public.reviews SET version=version+1,updated_at=now()
            WHERE id=${id}`;
        }
      } else {
        if (decision.action === "hide" && review.moderation_status !== "approved")
          throw new Error("INVALID_STATE");
        if (decision.action !== "hide" && review.moderation_status !== "pending")
          throw new Error("ALREADY_REVIEWED");
        status = decision.action === "approve" ? "approved" : "rejected";
        if (decision.action === "hide") {
          await tx`UPDATE public.review_revisions SET status='superseded'
            WHERE review_id=${id} AND status='pending'`;
        }
        await tx`UPDATE public.reviews SET moderation_status=${status},
          reviewed_at=now(),decision_note=${decision.note || null},
          version=version+1,updated_at=now() WHERE id=${id}`;
      }
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('review',${id},${decision.revisionId ? "revision_" + status : decision.action},
          ${reason},
          ${tx.json({ status: review.moderation_status, version: review.version })},
          ${tx.json({ status, revisionId: decision.revisionId, version: Number(review.version) + 1 })})`;
      return { id, revisionId: decision.revisionId, status, version: Number(review.version) + 1 };
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    const code = (error as Error).message;
    if (code === "NOT_FOUND") return fail(code, 404);
    if (["STALE_VERSION", "ALREADY_REVIEWED", "INVALID_STATE"].includes(code))
      return fail(code, 409);
    console.error("Admin review moderation failed", error);
    return fail("MODERATION_UNAVAILABLE", 503);
  }
}
