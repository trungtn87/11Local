import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { FieldInputError, parseFieldCreate } from "@/lib/admin-category-fields";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ id: string }> };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
const validId = (id: string) => /^[a-z][a-z0-9_]{0,39}$/.test(id);

export async function GET(_request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!validId(id)) return fail("INVALID_CATEGORY", 400);
  try {
    const sql = db();
    const [category] = await sql`SELECT id, name FROM public.categories WHERE id=${id}`;
    if (!category) return fail("CATEGORY_NOT_FOUND", 404);
    const fields = await sql`
      SELECT f.id, f.category_id, f.field_key, f.label, f.field_type,
             f.help_text, f.options, f.is_required, f.is_visible, f.sort_order,
             COUNT(d.place_id)::int AS used_count
      FROM public.category_fields f
      LEFT JOIN public.places p ON p.category_id = f.category_id
      LEFT JOIN public.place_details d ON d.place_id = p.id AND d.details ? f.field_key
      WHERE f.category_id = ${id}
      GROUP BY f.id
      ORDER BY f.sort_order, f.created_at, f.id
    `;
    return NextResponse.json({ category, fields }, { headers });
  } catch (error) {
    console.error("Admin category field list failed", error);
    return fail("FIELDS_UNAVAILABLE", 503);
  }
}

export async function POST(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!validId(id)) return fail("INVALID_CATEGORY", 400);
  try {
    const input = parseFieldCreate(await request.json().catch(() => null));
    const field = await db().begin(async tx => {
      // Schema changes and Admin place writes use the same category advisory lock.
      await tx`SELECT pg_advisory_xact_lock(110, hashtext(${id}))`;
      const [category] = await tx`SELECT id FROM public.categories WHERE id=${id}`;
      if (!category) throw new FieldInputError("CATEGORY_NOT_FOUND");
      const [counter] = await tx`SELECT count(*)::int AS n, COALESCE(MAX(sort_order), 0) AS last
        FROM public.category_fields WHERE category_id=${id}`;
      if (Number(counter.n) >= 80) throw new FieldInputError("TOO_MANY_FIELDS");
      if (input.is_required && input.is_visible) {
        const [used] = await tx`SELECT EXISTS (SELECT 1 FROM public.places WHERE category_id=${id}) AS has_places`;
        if (used.has_places) throw new FieldInputError("REQUIRED_FIELD_MISSING_EXISTING_VALUES");
      }
      const [created] = await tx`INSERT INTO public.category_fields
        (category_id, field_key, label, field_type, help_text, options, is_required, is_visible, sort_order)
        VALUES (${id}, ${input.field_key}, ${input.label}, ${input.field_type},
                ${input.help_text}, ${tx.json(input.options)}, ${input.is_required},
                ${input.is_visible}, ${Number(counter.last) + 10})
        RETURNING id, category_id, field_key, label, field_type, help_text, options,
                  is_required, is_visible, sort_order`;
      return created;
    });
    return NextResponse.json({ field }, { status: 201, headers });
  } catch (error) {
    if (error instanceof FieldInputError) {
      return fail(error.message, error.message === "CATEGORY_NOT_FOUND" ? 404 :
        error.message === "REQUIRED_FIELD_MISSING_EXISTING_VALUES" ? 409 : 400);
    }
    if ((error as { code?: string }).code === "23505") return fail("FIELD_KEY_EXISTS", 409);
    console.error("Admin category field create failed", error);
    return fail("FIELD_SAVE_FAILED", 503);
  }
}
