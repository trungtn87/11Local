import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { parsePlaceInput, haversineMeters } from "@/lib/place-input";
import { validatePlaceDetails } from "@/lib/place-extra-fields";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

export async function GET() {
  if (!await isAdmin()) return unauthorized();
  try {
    const rows = await db()`SELECT p.*, c.name AS category_name,
      COALESCE(d.details, '{}'::jsonb) AS details,
      (SELECT count(*)::int FROM place_photos ph WHERE ph.place_id=p.id) AS photo_count
      FROM public.places p
      JOIN public.categories c ON c.id=p.category_id
      LEFT JOIN public.place_details d ON d.place_id=p.id
      ORDER BY p.updated_at DESC LIMIT 500`;
    return NextResponse.json({ places: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin place listing failed", error);
    return NextResponse.json({ error: "ADMIN_PLACES_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return unauthorized();
  try {
    const input = parsePlaceInput(await request.json());
    const sql = db();
    const result = await sql.begin(async (tx) => {
      const [category] = await tx`SELECT id FROM public.categories WHERE id=${input.categoryId}`;
      if (!category) throw new Error("INVALID_CATEGORY");
      const defs = await tx`SELECT field_key, field_type, label, options, is_required
        FROM public.category_fields WHERE category_id=${input.categoryId} AND is_visible=true`;
      const details = validatePlaceDetails(input.details, defs);
      const existing = await tx`SELECT id,name,address,latitude,longitude FROM public.places
        WHERE lower(name)=lower(${input.name})
          OR (latitude BETWEEN ${input.latitude - .005} AND ${input.latitude + .005}
          AND longitude BETWEEN ${input.longitude - .005} AND ${input.longitude + .005})
        LIMIT 20`;
      if (existing.some((p) => String(p.name).toLocaleLowerCase("vi") === input.name.toLocaleLowerCase("vi")
        || haversineMeters(Number(p.latitude),Number(p.longitude),input.latitude,input.longitude) < 100)) {
        return { duplicate: existing };
      }
      const [place] = await tx`INSERT INTO public.places
        (slug,name,category_id,place_kind,summary,description,address,area,
         latitude,longitude,phone,website_url,opening_hours,price_note,
         featured_rank,moderation_status,visibility)
        VALUES (${input.slug},${input.name},${input.categoryId},${input.placeKind},
                ${input.summary},${input.description},${input.address},${input.area},
                ${input.latitude},${input.longitude},${input.phone},${input.websiteUrl},
                ${input.openingHours},${input.priceNote},${input.featuredRank},
                'pending',${input.visibility})
        RETURNING *`;
      await tx`INSERT INTO public.place_details (place_id, details) VALUES
        (${place.id},${tx.json(details)})`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,after_data)
        VALUES ('place',${place.id},'created_pending','Admin created draft',${tx.json({place,details})})`;
      return { place: {...place, details} };
    });
    if ("duplicate" in result) {
      return NextResponse.json({ error: "POSSIBLE_DUPLICATE", matches: result.duplicate }, { status: 409 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const e = error as { message?: string; code?: string };
    if (e.code === "23505") return NextResponse.json({ error: "SLUG_EXISTS" }, { status: 409 });
    if (e.code === "23503") return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
    if (e.message?.startsWith("DATABASE_URL")) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
    if (e.message?.startsWith("INVALID_") || e.message?.includes("_REQUIRED") ||
      e.message?.includes("_TOO_LONG") || e.message?.startsWith("UNKNOWN_DETAIL_FIELD") ||
      e.message?.startsWith("REQUIRED_DETAIL_FIELD")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("Admin place creation failed", error);
    return NextResponse.json({ error: "PLACE_SAVE_FAILED" }, { status: 500 });
  }
}
