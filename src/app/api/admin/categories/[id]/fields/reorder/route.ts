import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { FieldInputError, parseFieldOrder } from "@/lib/admin-category-fields";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ id: string }> };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function PUT(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(id)) return fail("INVALID_CATEGORY", 400);
  try {
    const ids = parseFieldOrder(await request.json().catch(() => null));
    await db().begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(110, hashtext(${id}))`;
      const existing = await tx`SELECT id FROM public.category_fields WHERE category_id=${id} FOR UPDATE`;
      const valid = existing.length === ids.length && existing.every(row => ids.includes(String(row.id)));
      if (!valid) throw new FieldInputError("STALE_FIELD_ORDER");
      for (let index = 0; index < ids.length; index++) {
        await tx`UPDATE public.category_fields SET sort_order=${(index + 1) * 10}
          WHERE category_id=${id} AND id=${ids[index]}`;
      }
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    if (error instanceof FieldInputError)
      return fail(error.message, error.message === "STALE_FIELD_ORDER" ? 409 : 400);
    console.error("Admin field reorder failed", error);
    return fail("FIELD_REORDER_FAILED", 503);
  }
}
