import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isUuid, canReview, parseReviewPlace } from "@/lib/contribution-review";
import { isPossibleDuplicate, distanceMeters } from "@/lib/contribution-input";
import { validatePlaceDetails } from "@/lib/place-extra-fields";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const noCache = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noCache });
const originOkay = (request: Request) => !request.headers.get("origin") ||
  request.headers.get("origin") === new URL(request.url).origin;

export async function GET(_request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("NOT_FOUND", 404);
  try {
    const sql = db();
    const [contribution] = await sql`SELECT * FROM public.contributions
      WHERE id=${id} AND kind='new_place' LIMIT 1`;
    if (!contribution) return fail("NOT_FOUND", 404);
    const hasPublishedPlace = contribution.moderation_status === "approved" && Boolean(contribution.place_id);
    const [photos, categories, fields, publishedPlace] = await Promise.all([
      hasPublishedPlace
        ? sql`SELECT id, (photo_type='cover') AS is_cover, sort_order,
            true AS published
            FROM public.place_photos WHERE place_id=${contribution.place_id}
            AND moderation_status='approved' ORDER BY sort_order, id`
        : sql`SELECT id, is_cover, sort_order, false AS published
            FROM public.contribution_photos WHERE contribution_id=${id} ORDER BY sort_order, id`,
      sql`SELECT id, name, visibility FROM public.categories ORDER BY sort_order, name`,
      sql`SELECT category_id, field_key, field_type, label, options, is_required, help_text, sort_order
        FROM public.category_fields WHERE is_visible=true ORDER BY category_id, sort_order, field_key`,
      hasPublishedPlace ? sql`SELECT slug, name FROM public.places WHERE id=${contribution.place_id} LIMIT 1`
        : Promise.resolve([]),
    ]);
    const payload = contribution.payload as Record<string, unknown>;
    const lat = Number(payload.latitude), lng = Number(payload.longitude);
    let nearby: { id: string; slug: string; name: string; distanceMeters: number }[] = [];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const candidates = await sql`SELECT id, slug, name, latitude, longitude FROM public.places
        WHERE moderation_status='approved'
          AND latitude BETWEEN ${lat - 0.01} AND ${lat + 0.01}
          AND longitude BETWEEN ${lng - 0.01} AND ${lng + 0.01}
        LIMIT 100`;
      nearby = candidates.filter(place => isPossibleDuplicate(
        String(payload.name ?? ""), lat, lng, String(place.name),
        Number(place.latitude), Number(place.longitude),
      )).map(place => ({
        id: String(place.id), slug: String(place.slug), name: String(place.name),
        distanceMeters: Math.round(distanceMeters(lat, lng, Number(place.latitude), Number(place.longitude))),
      }));
    }
    return NextResponse.json({
      contribution, photos, categories, fields, nearby,
      publishedPlace: publishedPlace[0] ?? null,
    }, { headers: noCache });
  } catch (error) {
    console.error("Admin contribution detail failed", error);
    return fail("CONTRIBUTION_DETAIL_UNAVAILABLE", 503);
  }
}

// Save an editorial draft without publishing it. Audit original and updated content.
export async function PATCH(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  if (!originOkay(request)) return fail("INVALID_ORIGIN", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("NOT_FOUND", 404);
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) return fail("INVALID_VERSION", 400);
  let place;
  try { place = parseReviewPlace(body.place); }
  catch (error) { return fail(error instanceof Error ? error.message : "INVALID_INPUT", 400); }
  try {
    const sql = db();
    const result = await sql.begin(async tx => {
      const [current] = await tx`SELECT * FROM public.contributions
        WHERE id=${id} AND kind='new_place' FOR UPDATE`;
      if (!current) throw new Error("NOT_FOUND");
      if (!canReview(current.moderation_status)) throw new Error("ALREADY_REVIEWED");
      if (Number(current.version) !== body.expectedVersion) throw new Error("STALE_VERSION");
      // Keep validation consistent with Admin category field changes.
      await tx`SELECT pg_advisory_xact_lock(110, hashtext(${place.categoryId}))`;
      const [category] = await tx`SELECT id FROM public.categories WHERE id=${place.categoryId}`;
      if (!category) throw new Error("INVALID_CATEGORY");
      const defs = await tx`SELECT field_key, field_type, label, options, is_required
        FROM public.category_fields WHERE category_id=${place.categoryId} AND is_visible=true`;
      const valid = validatePlaceDetails(place.details, defs.map(row => ({
        field_key: String(row.field_key), field_type: String(row.field_type), label: String(row.label),
        options: row.options, is_required: Boolean(row.is_required),
      })));
      const next = { ...place, details: valid };
      const [updated] = await tx`UPDATE public.contributions
        SET payload=${tx.json(next)}, version=version+1, updated_at=now()
        WHERE id=${id} RETURNING *`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type, entity_id, action, reason, before_data, after_data)
        VALUES ('contribution',${id},'admin_edited','Admin edited community proposal',
          ${tx.json({payload: current.payload,version: current.version})},
          ${tx.json({payload: next,version: updated.version})})`;
      return updated;
    });
    return NextResponse.json({ contribution: result }, { headers: noCache });
  } catch (error) {
    const code = (error as Error).message;
    if (code === "NOT_FOUND") return fail(code, 404);
    if (code === "ALREADY_REVIEWED" || code === "STALE_VERSION") return fail(code, 409);
    if (code === "INVALID_CATEGORY" || code.startsWith("UNKNOWN_DETAIL_FIELD") ||
        code.startsWith("REQUIRED_DETAIL_FIELD") || code.startsWith("INVALID_DETAIL_FIELD")) return fail(code, 400);
    console.error("Admin contribution edit failed", error);
    return fail("SAVE_FAILED", 503);
  }
}
