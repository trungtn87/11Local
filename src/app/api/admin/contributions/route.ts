import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const statuses = new Set(["all", "pending", "needs_info", "approved", "rejected"]);

export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (!statuses.has(status)) return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  try {
    const sql = db();
    const [rows, counts] = await Promise.all([
      sql`SELECT c.id, c.tracking_code, c.kind, c.moderation_status, c.created_at,
          c.updated_at, c.version, c.place_id,
          COALESCE(c.payload->>'name', c.payload->>'placeName') AS name, c.payload->>'area' AS area,
          c.payload->>'categoryId' AS category_id,
          (SELECT count(*)::int FROM public.contribution_photos ph
           WHERE ph.contribution_id=c.id) AS photo_count
        FROM public.contributions c
        WHERE (${status}='all' OR c.moderation_status=${status})
        ORDER BY c.created_at DESC, c.id DESC LIMIT 100`,
      sql`SELECT moderation_status, count(*)::int AS total
        FROM public.contributions GROUP BY moderation_status`,
    ]);
    return NextResponse.json({ contributions: rows, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin contribution queue failed", error);
    return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
  }
}
