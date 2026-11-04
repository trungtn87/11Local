import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { FieldInputError, parseFieldPatch, validateFieldOptions, type FieldType } from "@/lib/admin-category-fields";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ id: string; fieldId: string }> };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
const validId = (id: string) => /^[a-z][a-z0-9_]{0,39}$/.test(id);
const validUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function PATCH(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id, fieldId } = await params;
  if (!validId(id) || !validUuid(fieldId)) return fail("INVALID_FIELD", 400);
  try {
    const change = parseFieldPatch(await request.json().catch(() => null));
    const field = await db().begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(110, hashtext(${id}))`;
      const [old] = await tx`SELECT * FROM public.category_fields
        WHERE id=${fieldId} AND category_id=${id} FOR UPDATE`;
      if (!old) throw new FieldInputError("FIELD_NOT_FOUND");
      const oldType = String(old.field_type);
      const nextType = (change.field_type ?? oldType) as FieldType;
      const nextOptions = change.options ?? (nextType !== oldType && nextType !== "select" && nextType !== "multi_select"
        ? [] : (Array.isArray(old.options) ? old.options as string[] : []));
      validateFieldOptions({ field_type: nextType, options: nextOptions });
      const nextRequired = change.is_required ?? Boolean(old.is_required);
      const nextVisible = change.is_visible ?? Boolean(old.is_visible);
      const key = String(old.field_key);
      const [usage] = await tx`SELECT EXISTS (
        SELECT 1 FROM public.places p
        JOIN public.place_details d ON d.place_id=p.id
        WHERE p.category_id=${id} AND d.details ? ${key}
      ) AS has_values`;
      if (nextType !== oldType && usage.has_values) throw new FieldInputError("FIELD_TYPE_IN_USE");

      // Don't enable a required field if any existing place is missing its value.
      if (nextRequired && nextVisible && (!old.is_required || !old.is_visible)) {
        const [missing] = await tx`SELECT EXISTS (
          SELECT 1 FROM public.places p
          LEFT JOIN public.place_details d ON d.place_id=p.id
          WHERE p.category_id=${id}
            AND (d.place_id IS NULL OR NOT (d.details ? ${key})
                 OR d.details -> ${key} IN ('null'::jsonb, '""'::jsonb, '[]'::jsonb))
        ) AS missing`;
        if (missing.missing) throw new FieldInputError("REQUIRED_FIELD_MISSING_EXISTING_VALUES");
      }

      // Persisted select/multi_select values must all remain valid after option edits.
      if (usage.has_values && (nextType === "select" || nextType === "multi_select")) {
        const expectedJsonType = nextType === "select" ? "string" : "array";
        const [conflict] = await tx`SELECT EXISTS (
          SELECT 1 FROM public.places p
          JOIN public.place_details d ON d.place_id=p.id
          WHERE p.category_id=${id} AND d.details ? ${key}
            AND (jsonb_typeof(d.details -> ${key}) <> ${expectedJsonType}
                 OR NOT (${tx.json(nextOptions)}::jsonb @> (d.details -> ${key})))
        ) AS conflict`;
        if (conflict.conflict) throw new FieldInputError("OPTIONS_IN_USE");
      }

      const [updated] = await tx`UPDATE public.category_fields SET
        label=${change.label ?? old.label},
        field_type=${nextType},
        help_text=${change.help_text === undefined ? old.help_text : change.help_text},
        options=${tx.json(nextOptions)},
        is_required=${nextRequired},
        is_visible=${nextVisible}
        WHERE id=${fieldId} AND category_id=${id}
        RETURNING id, category_id, field_key, label, field_type, help_text, options,
                  is_required, is_visible, sort_order`;
      return updated;
    });
    return NextResponse.json({ field }, { headers });
  } catch (error) {
    if (error instanceof FieldInputError) {
      const status = error.message === "FIELD_NOT_FOUND" ? 404 :
        ["FIELD_TYPE_IN_USE", "OPTIONS_IN_USE", "REQUIRED_FIELD_MISSING_EXISTING_VALUES"].includes(error.message) ? 409 : 400;
      return fail(error.message, status);
    }
    console.error("Admin category field update failed", error);
    return fail("FIELD_SAVE_FAILED", 503);
  }
}
