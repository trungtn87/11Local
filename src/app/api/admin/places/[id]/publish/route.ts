import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/contribution-review";
import { parseExpectedVersion } from "@/lib/place-moderation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  let expectedVersion: number;
  try { expectedVersion = parseExpectedVersion(await request.json()); }
  catch { return NextResponse.json({ error: "INVALID_VERSION" }, { status: 400 }); }
  try {
    const sql = db();
    const place = await sql.begin(async (tx) => {
      const [before] = await tx`SELECT * FROM public.places WHERE id=${id} FOR UPDATE`;
      if (!before) throw new Error("NOT_FOUND");
      if (before.moderation_status !== "pending") throw new Error("ALREADY_REVIEWED");
      if (Number(before.version) !== expectedVersion) throw new Error("STALE_VERSION");
      const [updated] = await tx`UPDATE public.places SET
        moderation_status='approved', visibility='visible',
        published_at=COALESCE(published_at,now()),
        version=version+1, updated_at=now() WHERE id=${id} RETURNING *`;
      await tx`UPDATE public.place_photos SET moderation_status='approved' WHERE place_id=${id}`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('place',${id},'approved','Admin published place',
          ${tx.json(before)},${tx.json(updated)})`;
      return updated;
    });
    return NextResponse.json({ place });
  } catch (error) {
    const code = (error as { message?: string }).message;
    if (code === "NOT_FOUND") return NextResponse.json({ error: code }, { status: 404 });
    if (code === "ALREADY_REVIEWED" || code === "STALE_VERSION")
      return NextResponse.json({ error: code }, { status: 409 });
    console.error("Admin publish place failed", error);
    return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 500 });
  }
}
