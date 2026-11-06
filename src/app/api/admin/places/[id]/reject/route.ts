import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/contribution-review";
import { parsePlaceRejection } from "@/lib/place-moderation";

type Context = { params: Promise<{ id: string }> };
const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("NOT_FOUND", 404);
  let decision;
  try {
    decision = parsePlaceRejection(await request.json());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "INVALID_INPUT", 400);
  }
  try {
    const sql = db();
    const place = await sql.begin(async (tx) => {
      const [before] = await tx`SELECT * FROM public.places WHERE id=${id} FOR UPDATE`;
      if (!before) throw new Error("NOT_FOUND");
      if (before.moderation_status !== "pending") throw new Error("ALREADY_REVIEWED");
      if (Number(before.version) !== decision.expectedVersion) throw new Error("STALE_VERSION");
      const [updated] = await tx`UPDATE public.places SET
        moderation_status='rejected', visibility='hidden',
        version=version+1, updated_at=now()
        WHERE id=${id} RETURNING *`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('place',${id},'rejected',${decision.reason},
          ${tx.json(before)},${tx.json(updated)})`;
      return updated;
    });
    return NextResponse.json({ place }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = (error as { message?: string }).message;
    if (code === "NOT_FOUND") return fail(code, 404);
    if (code === "ALREADY_REVIEWED" || code === "STALE_VERSION") return fail(code, 409);
    console.error("Admin reject place failed", error);
    return fail("REJECT_FAILED", 500);
  }
}
