import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  try {
    const sql = db();
    const place = await sql.begin(async (tx) => {
      const [before] = await tx`SELECT * FROM public.places WHERE id=${id} FOR UPDATE`;
      if (!before) return null;
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
    if (!place) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ place });
  } catch (error) {
    console.error("Admin publish place failed", error);
    return NextResponse.json({ error: "PUBLISH_FAILED" }, { status: 500 });
  }
}
