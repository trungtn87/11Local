import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { parsePlaceInput } from "@/lib/place-input";
import { validatePlaceDetails } from "@/lib/place-extra-fields";

const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  if (!await isAdmin()) return unauthorized();
  const { id } = await params;
  try {
    const input = parsePlaceInput(await request.json());
    if (input.expectedVersion === null) {
      return NextResponse.json({ error: "VERSION_REQUIRED" }, { status: 400 });
    }
    const sql = db();
    const place = await sql.begin(async (tx) => {
      // Serialize place writes with changes to their category field schema.
      await tx`SELECT pg_advisory_xact_lock(110, hashtext(${input.categoryId}))`;
      const [before] = await tx`SELECT * FROM public.places WHERE id=${id} FOR UPDATE`;
      if (!before) throw new Error("NOT_FOUND");
      if (Number(before.version) !== input.expectedVersion) throw new Error("STALE_VERSION");
      const [category] = await tx`SELECT id FROM public.categories WHERE id=${input.categoryId}`;
      if (!category) throw new Error("INVALID_CATEGORY");
      const defs = await tx`SELECT field_key, field_type, label, options, is_required
        FROM public.category_fields WHERE category_id=${input.categoryId} AND is_visible=true`;
      const visibleDetails = validatePlaceDetails(input.details, defs.map(f => ({
        field_key: String(f.field_key), field_type: String(f.field_type),
        label: String(f.label), options: f.options, is_required: Boolean(f.is_required),
      })));
      const [previousDetails] = await tx`SELECT details FROM public.place_details WHERE place_id=${id}`;
      const prior = (previousDetails?.details ?? {}) as Record<string, unknown>;
      // When editing the same category, retain unknown/now-hidden keys only from
      // the already stored document. The client may never submit those keys.
      const visibleKeys = new Set(defs.map((f) => String(f.field_key)));
      const hiddenDetails = before.category_id === input.categoryId
        ? Object.fromEntries(Object.entries(prior).filter(([key]) => !visibleKeys.has(key)))
        : {};
      const details = { ...hiddenDetails, ...visibleDetails };
      const [updated] = await tx`UPDATE public.places SET
        slug=${input.slug}, name=${input.name}, category_id=${input.categoryId},
        place_kind=${input.placeKind}, summary=${input.summary}, description=${input.description},
        address=${input.address}, area=${input.area},
        latitude=${input.latitude}, longitude=${input.longitude},
        phone=${input.phone}, website_url=${input.websiteUrl},
        facebook_url=${input.facebookUrl}, youtube_url=${input.youtubeUrl},
        opening_hours=${input.openingHours}, price_note=${input.priceNote},
        featured_rank=${input.featuredRank}, visibility=${input.visibility},
        version=version+1, updated_at=now()
        WHERE id=${id} RETURNING *`;
      await tx`INSERT INTO public.place_details (place_id,details)
        VALUES (${id},${tx.json(details)})
        ON CONFLICT (place_id) DO UPDATE SET
          details=EXCLUDED.details, version=public.place_details.version+1, updated_at=now()`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('place',${id},'updated','Admin updated place',
          ${tx.json({place:before,details:prior})},${tx.json({place:updated,details})})`;
      return { ...updated, details };
    });
    return NextResponse.json({ place }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const e = error as { message?: string; code?: string };
    if (e.message === "NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (e.message === "STALE_VERSION") return NextResponse.json({ error: "STALE_VERSION" }, { status: 409 });
    if (e.code === "23505") return NextResponse.json({ error: "SLUG_EXISTS" }, { status: 409 });
    if (e.code === "23503") return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
    if (e.message?.startsWith("INVALID_") || e.message?.includes("_REQUIRED") ||
      e.message?.includes("_TOO_LONG") || e.message?.startsWith("UNKNOWN_DETAIL_FIELD") ||
      e.message?.startsWith("REQUIRED_DETAIL_FIELD")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("Admin place update failed", error);
    return NextResponse.json({ error: "PLACE_SAVE_FAILED" }, { status: 500 });
  }
}
