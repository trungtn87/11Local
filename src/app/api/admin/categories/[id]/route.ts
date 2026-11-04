import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { CategoryInputError, parseCategoryPatch } from "@/lib/admin-category-input";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin())
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
  const { id } = await params;
  if (!id || id.length > 80) return NextResponse.json({ error: "INVALID_ID" }, { status: 400, headers });
  try {
    const changes = parseCategoryPatch(await request.json().catch(() => null));
    // Deliberately never update the primary key. Hiding is non-destructive.
    const [category] = await db()`
      UPDATE public.categories
      SET name = COALESCE(${changes.name ?? null}, name),
          icon = COALESCE(${changes.icon ?? null}, icon),
          visibility = COALESCE(${changes.visibility ?? null}, visibility)
      WHERE id = ${id}
      RETURNING id, name, icon, visibility, sort_order
    `;
    if (!category) return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404, headers });
    return NextResponse.json({ category }, { headers });
  } catch (error) {
    if (error instanceof CategoryInputError)
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    console.error("Admin category update failed", error);
    return NextResponse.json({ error: "CATEGORY_SAVE_FAILED" }, { status: 503, headers });
  }
}
