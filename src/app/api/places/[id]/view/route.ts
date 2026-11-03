import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "INVALID_PLACE_ID" }, { status: 400 });

  try {
    const sql = db();
    const updated = await sql`
      INSERT INTO place_metrics (place_id, view_count)
      SELECT id, 1 FROM places
      WHERE id = ${id}::uuid AND moderation_status = 'approved' AND visibility = 'visible'
      ON CONFLICT (place_id) DO UPDATE
      SET view_count = place_metrics.view_count + 1, updated_at = now()
      RETURNING view_count
    `;
    if (!updated.length) return NextResponse.json({ error: "PLACE_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Place view counter failed", error);
    return NextResponse.json({ error: "METRICS_UNAVAILABLE" }, { status: 503 });
  }
}
