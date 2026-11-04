import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function GET(request: Request) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (!["all", "pending", "approved", "rejected"].includes(status))
    return fail("INVALID_STATUS", 400);
  try {
    const sql = db();
    const [items, count] = await Promise.all([
      sql`SELECT * FROM (
        SELECT 'review'::text AS kind, r.id, r.id AS review_id, NULL::uuid AS revision_id,
          r.stars, r.content, r.moderation_status AS status, r.created_at AS submitted_at,
          r.version, p.id AS place_id, p.name AS place_name, p.slug AS place_slug,
          u.display_name AS author_name
        FROM public.reviews r
        JOIN public.places p ON p.id=r.place_id
        JOIN public.users u ON u.id=r.user_id
        WHERE r.deleted_at IS NULL AND (${status}='all' OR r.moderation_status=${status})
        UNION ALL
        SELECT 'revision'::text AS kind, rv.id, r.id AS review_id, rv.id AS revision_id,
          rv.stars, rv.content, rv.status, rv.created_at AS submitted_at,
          r.version, p.id AS place_id, p.name AS place_name, p.slug AS place_slug,
          u.display_name AS author_name
        FROM public.review_revisions rv
        JOIN public.reviews r ON r.id=rv.review_id AND r.deleted_at IS NULL
        JOIN public.places p ON p.id=r.place_id
        JOIN public.users u ON u.id=r.user_id
        WHERE (${status}='all' OR rv.status=${status})
      ) queue ORDER BY submitted_at DESC, id DESC LIMIT 100`,
      sql`SELECT
        (SELECT count(*) FROM public.reviews WHERE moderation_status='pending'
          AND deleted_at IS NULL) +
        (SELECT count(*) FROM public.review_revisions rv JOIN public.reviews r
          ON r.id=rv.review_id
          WHERE rv.status='pending' AND r.deleted_at IS NULL) AS pending_total`,
    ]);
    return NextResponse.json({ reviews: items, pendingTotal: Number(count[0]?.pending_total ?? 0) }, { headers });
  } catch (error) {
    console.error("Admin reviews queue failed", error);
    return fail("QUEUE_UNAVAILABLE", 503);
  }
}
