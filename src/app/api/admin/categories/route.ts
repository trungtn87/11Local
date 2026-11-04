import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { CategoryInputError, parseCategoryCreate } from "@/lib/admin-category-input";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });

export async function GET() {
  if (!await isAdmin()) return unauthorized();
  try {
    const categories = await db()`
      SELECT c.id, c.name, c.icon, c.sort_order, c.visibility,
             COUNT(p.id)::int AS place_count
      FROM public.categories c
      LEFT JOIN public.places p ON p.category_id = c.id
      GROUP BY c.id, c.name, c.icon, c.sort_order, c.visibility
      ORDER BY c.sort_order, c.name, c.id
    `;
    return NextResponse.json({ categories }, { headers });
  } catch (error) {
    console.error("Admin category list failed", error);
    return NextResponse.json({ error: "CATEGORIES_UNAVAILABLE" }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return unauthorized();
  try {
    const input = parseCategoryCreate(await request.json().catch(() => null));
    const [category] = await db().begin(async tx => {
      // Serialize creates/reorders without touching any existing category or place data.
      await tx`SELECT pg_advisory_xact_lock(110, 422)`;
      const [position] = await tx`SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order FROM public.categories`;
      return tx`INSERT INTO public.categories (id, name, icon, visibility, sort_order)
        VALUES (${input.id}, ${input.name}, ${input.icon}, ${input.visibility}, ${Number(position.next_order)})
        RETURNING id, name, icon, visibility, sort_order`;
    });
    return NextResponse.json({ category }, { status: 201, headers });
  } catch (error) {
    if (error instanceof CategoryInputError)
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    if ((error as { code?: string }).code === "23505")
      return NextResponse.json({ error: "CATEGORY_ID_EXISTS" }, { status: 409, headers });
    console.error("Admin category create failed", error);
    return NextResponse.json({ error: "CATEGORY_SAVE_FAILED" }, { status: 503, headers });
  }
}
