import { isAllowedRequestOrigin } from "@/lib/request-origin";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { canReview, contributionSlug, isUuid, parseReviewDecision } from "@/lib/contribution-review";
import { isPossibleDuplicate } from "@/lib/contribution-input";
import { validatePlaceDetails } from "@/lib/place-extra-fields";
import { enqueueBusinessDiscordInTx } from "@/lib/discord-business-events";

type Context = { params: Promise<{ id: string }> };
const noCache = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noCache });
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: Context) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  if (!isAllowedRequestOrigin(request)) return fail("INVALID_ORIGIN", 403);
  const { id } = await params;
  if (!isUuid(id)) return fail("NOT_FOUND", 404);
  let decision;
  try { decision = parseReviewDecision(await request.json()); }
  catch (error) { return fail(error instanceof Error ? error.message : "INVALID_INPUT", 400); }
  const sql = db();
  try {
    const result = await sql.begin(async tx => {
      const [current] = await tx`SELECT * FROM public.contributions
        WHERE id=${id} AND kind='new_place' FOR UPDATE`;
      if (!current) throw new Error("NOT_FOUND");
      if (!canReview(current.moderation_status)) throw new Error("ALREADY_REVIEWED");
      if (Number(current.version) !== decision.expectedVersion) throw new Error("STALE_VERSION");

      if (decision.action !== "approve") {
        const nextStatus = decision.action === "reject" ? "rejected" : "needs_info";
        const [updated] = await tx`UPDATE public.contributions
          SET moderation_status=${nextStatus}, decision_note=${decision.note},
            reviewed_at=now(), version=version+1, updated_at=now()
          WHERE id=${id} RETURNING id, moderation_status, version`;
        await tx`INSERT INTO public.contribution_messages (contribution_id,sender,body)
          VALUES (${id},'admin',${decision.note})`;
        await tx`INSERT INTO public.moderation_logs
          (entity_type,entity_id,action,reason,before_data,after_data)
          VALUES ('contribution',${id},${nextStatus},${decision.note},
            ${tx.json({status: current.moderation_status,version: current.version})},
            ${tx.json({status: nextStatus,version: updated.version})})`;
        await enqueueBusinessDiscordInTx(tx,
          nextStatus === "rejected" ? "moderation.contribution.rejected" : "moderation.contribution.needs_info",
          id, Number(updated.version));
        return { status: nextStatus, version: updated.version, place: null };
      }

      const place = decision.place;
      if (!place) throw new Error("INVALID_INPUT");

      // Serialize publication so two reviewers cannot accidentally create the
      // same nearby name concurrently, even for different contributions.
      await tx`SELECT pg_advisory_xact_lock(11100002)`;
      // Match category-schema locking used by other Admin place writers.
      await tx`SELECT pg_advisory_xact_lock(110, hashtext(${place.categoryId}))`;
      const [category] = await tx`SELECT id FROM public.categories
        WHERE id=${place.categoryId} AND visibility='visible' LIMIT 1`;
      if (!category) throw new Error("INVALID_CATEGORY");
      const definitions = await tx`SELECT field_key, field_type, label, options, is_required
        FROM public.category_fields WHERE category_id=${place.categoryId} AND is_visible=true`;
      const details = validatePlaceDetails(place.details, definitions.map(field => ({
        field_key: String(field.field_key), field_type: String(field.field_type),
        label: String(field.label), options: field.options, is_required: Boolean(field.is_required),
      })));
      const nearby = await tx`SELECT id,name,latitude,longitude FROM public.places
        WHERE moderation_status='approved'
          AND latitude BETWEEN ${place.latitude - 0.01} AND ${place.latitude + 0.01}
          AND longitude BETWEEN ${place.longitude - 0.01} AND ${place.longitude + 0.01}
        LIMIT 100`;
      const duplicates = nearby.filter(item => isPossibleDuplicate(
        place.name, place.latitude, place.longitude, String(item.name),
        Number(item.latitude), Number(item.longitude),
      ));
      if (duplicates.length && !decision.allowDuplicate) throw new Error("POSSIBLE_DUPLICATE");
      if (duplicates.length && decision.note.length < 10) throw new Error("DUPLICATE_REASON_REQUIRED");

      const staged = await tx`SELECT id,sort_order,is_cover FROM public.contribution_photos
        WHERE contribution_id=${id} ORDER BY sort_order, id FOR UPDATE`;
      const availableIds = staged.map(photo => String(photo.id));
      const chosenIds = decision.approvedPhotoIds ?? availableIds;
      if (chosenIds.some(photoId => !availableIds.includes(photoId))) throw new Error("INVALID_PHOTO_SELECTION");
      if (decision.coverPhotoId && !chosenIds.includes(decision.coverPhotoId)) throw new Error("COVER_NOT_SELECTED");
      const coverId = decision.coverPhotoId ?? chosenIds[0] ?? null;

      const slug = contributionSlug(place.name, id);
      const [created] = await tx`INSERT INTO public.places
        (slug,name,category_id,place_kind,summary,description,address,area,
         latitude,longitude,phone,website_url,opening_hours,price_note,
         moderation_status,ownership_status,visibility,published_at)
        VALUES (${slug},${place.name},${place.categoryId},${place.placeKind},
          ${place.summary},${place.description},${place.address},${place.area},
          ${place.latitude},${place.longitude},${place.phone || null},
          ${place.websiteUrl || null},${place.openingHours || null},${place.priceNote || null},
          'approved','unverified','visible',now())
        RETURNING id,slug,name`;
      await tx`INSERT INTO public.place_details (place_id,details)
        VALUES (${created.id},${tx.json(details)})`;

      // Promote only reviewed photos. Bytes move to published storage atomically;
      // staged copies are disposed afterwards to avoid doubling Neon storage.
      for (let i = 0; i < chosenIds.length; i++) {
        const photoId = chosenIds[i];
        const photoType = photoId === coverId ? "cover" : "gallery";
        await tx`INSERT INTO public.place_photos
          (id,place_id,object_key,source,photo_type,moderation_status,sort_order)
          VALUES (${photoId},${created.id},${"neon:" + photoId},'community',
            ${photoType},'approved',${i})`;
        await tx`INSERT INTO public.place_image_blobs (photo_id,mime_type,contents)
          SELECT id,mime_type,contents FROM public.contribution_photos
          WHERE contribution_id=${id} AND id=${photoId}`;
      }
      const reviewedPayload = { ...place, details };
      const [updated] = await tx`UPDATE public.contributions
        SET moderation_status='approved',place_id=${created.id},
          payload=${tx.json(reviewedPayload)},decision_note=${decision.note || null},
          reviewed_at=now(),version=version+1,updated_at=now()
        WHERE id=${id} RETURNING version`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,before_data,after_data)
        VALUES ('contribution',${id},'approved',${decision.note || "Admin approved community place"},
          ${tx.json({status: current.moderation_status, original: current.payload, version: current.version})},
          ${tx.json({placeId: created.id,slug: created.slug,reviewed: reviewedPayload,
            photoIds: chosenIds,coverPhotoId: coverId,ignoredPhotoCount: availableIds.length - chosenIds.length,
            duplicateOverride: duplicates.length > 0,version: updated.version})})`;
      await tx`INSERT INTO public.moderation_logs
        (entity_type,entity_id,action,reason,after_data)
        VALUES ('place',${created.id},'created_from_contribution','Admin approved community contribution',
          ${tx.json({contributionId: id, name: created.name})})`;
      await tx`DELETE FROM public.contribution_photos WHERE contribution_id=${id}`;
      await enqueueBusinessDiscordInTx(tx,"moderation.contribution.approved",id,Number(updated.version));
      return { status: "approved", version: updated.version, place: created };
    });

    return NextResponse.json(result, { headers: noCache });
  } catch (error) {
    const code = (error as { message?: string; code?: string }).message ?? "REVIEW_FAILED";
    if (code === "NOT_FOUND") return fail(code, 404);
    if (["ALREADY_REVIEWED", "STALE_VERSION", "POSSIBLE_DUPLICATE"].includes(code))
      return fail(code, 409);
    if (code === "DUPLICATE_REASON_REQUIRED" || code === "INVALID_CATEGORY" ||
        code === "INVALID_INPUT" || code === "INVALID_PHOTO_SELECTION" ||
        code === "COVER_NOT_SELECTED" || code.startsWith("UNKNOWN_DETAIL_FIELD") ||
        code.startsWith("REQUIRED_DETAIL_FIELD") || code.startsWith("INVALID_DETAIL_FIELD"))
      return fail(code, 400);
    if ((error as { code?: string }).code === "23505") return fail("SLUG_CONFLICT", 409);
    console.error("Admin contribution review failed", error);
    return fail("REVIEW_FAILED", 503);
  }
}
