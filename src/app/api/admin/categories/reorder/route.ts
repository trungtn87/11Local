import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { CategoryInputError, parseCategoryOrder } from "@/lib/admin-category-input";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function PUT(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
  try {
    const ids = parseCategoryOrder(await request.json().catch(() => null));
    await db().begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(110, 422)`;
      const existing = await tx`SELECT id FROM public.categories ORDER BY id FOR UPDATE`;
      const valid = existing.length === ids.length &&
        existing.every(row => ids.includes(String(row.id)));
      if (!valid) throw new CategoryInputError("STALE_ORDER");
      // Reposition only; category IDs and place foreign keys remain untouched.
      for (let index = 0; index < ids.length; index++) {
        await tx`UPDATE public.categories SET sort_order = ${(index + 1) * 10} WHERE id = ${ids[index]}`;
      }
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    if (error instanceof CategoryInputError)
      return NextResponse.json({ error: error.message }, { status: error.message === "STALE_ORDER" ? 409 : 400, headers });
    console.error("Admin category reorder failed", error);
    return NextResponse.json({ error: "CATEGORY_REORDER_FAILED" }, { status: 503, headers });
  }
}
