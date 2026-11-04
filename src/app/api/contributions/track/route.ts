import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }
  const hash = createHash("sha256").update(token).digest("hex");
  try {
    const [row] = await db()`SELECT c.tracking_code, c.moderation_status, c.kind,
      c.payload->>'name' AS place_name, c.created_at, c.decision_note,
      published.slug AS place_slug
      FROM public.contributions c
      LEFT JOIN public.places published ON published.id = c.place_id
        AND published.moderation_status='approved' AND published.visibility='visible'
      WHERE c.tracking_token_hash = ${hash} LIMIT 1`;
    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({
      trackingCode: row.tracking_code, status: row.moderation_status,
      kind: row.kind, placeName: row.place_name, createdAt: row.created_at,
      decisionNote: row.decision_note, placeSlug: row.place_slug,
    }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("Contribution tracking failed", error);
    return NextResponse.json({ error: "TRACKING_UNAVAILABLE" }, { status: 503 });
  }
}
