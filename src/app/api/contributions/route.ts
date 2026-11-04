import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import { parseNewPlaceContribution } from "@/lib/contribution-input";
import { findContributionDuplicates } from "@/lib/contribution-duplicates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 45 * 1024 * 1024;
const MAX_PHOTOS = 4;
const MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

function fingerprint(request: Request) {
  // Use the rightmost forwarded address from the trusted deployment proxy.
  const ip = request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown";
  const secret = process.env.CONTRIBUTION_RATE_LIMIT_SECRET || process.env.USER_SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("DATABASE_URL is not configured");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

async function consumeSubmissionLimit(request: Request) {
  const key = fingerprint(request);
  const [row] = await db()`INSERT INTO public.contribution_rate_limits (fingerprint, window_start, attempts)
    VALUES (${key}, now(), 1)
    ON CONFLICT (fingerprint) DO UPDATE SET
      attempts = CASE WHEN contribution_rate_limits.window_start < now() - interval '24 hours'
        THEN 1 ELSE contribution_rate_limits.attempts + 1 END,
      window_start = CASE WHEN contribution_rate_limits.window_start < now() - interval '24 hours'
        THEN now() ELSE contribution_rate_limits.window_start END
    RETURNING attempts`;
  return Number(row.attempts) <= 5;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_REQUEST_BYTES) return fail("REQUEST_TOO_LARGE", 413);
  try {
    if (!await consumeSubmissionLimit(request)) return fail("RATE_LIMITED", 429);
    const form = await request.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string" || raw.length > 15000) return fail("INVALID_INPUT", 400);
    let input;
    try { input = parseNewPlaceContribution(JSON.parse(raw)); }
    catch (error) { return fail(error instanceof Error ? error.message : "INVALID_INPUT", 400); }

    const images = form.getAll("photos");
    if (images.length > MAX_PHOTOS) return fail("TOO_MANY_PHOTOS", 400);
    const processed: { id: string; contents: Buffer }[] = [];
    for (const image of images) {
      if (!(image instanceof File) || !MIME_TYPES.has(image.type) ||
          image.size === 0 || image.size > MAX_FILE_BYTES) return fail("INVALID_IMAGE", 400);
      try {
        const contents = await sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: 40_000_000 })
          .rotate().resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 }).toBuffer();
        if (!contents.length) return fail("INVALID_IMAGE", 400);
        processed.push({ id: randomUUID(), contents });
      } catch { return fail("INVALID_IMAGE", 400); }
    }

    const sql = db();
    const [category] = await sql`SELECT id FROM public.categories
      WHERE id = ${input.categoryId} AND visibility = 'visible' LIMIT 1`;
    if (!category) return fail("INVALID_CATEGORY", 400);
    const duplicate = await findContributionDuplicates(input);
    if (duplicate.hasDuplicate && !input.acknowledgeDuplicate) {
      return NextResponse.json({ error: "POSSIBLE_DUPLICATE", ...duplicate }, { status: 409 });
    }
    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const trackingCode = "DG-" + new Date().getFullYear() + "-" + randomBytes(5).toString("hex").toUpperCase();
    const user = await getCurrentUser();
    const payload = {
      name: input.name, categoryId: input.categoryId, address: input.address, area: input.area,
      latitude: input.latitude, longitude: input.longitude, description: input.description,
      phone: input.phone, openingHours: input.openingHours,
    };
    await sql.begin(async tx => {
      const [record] = await tx`INSERT INTO public.contributions
        (tracking_code, tracking_token_hash, kind, payload, contact_phone, submitted_by, moderation_status)
        VALUES (${trackingCode}, ${tokenHash}, 'new_place', ${tx.json(payload)},
          ${input.contactPhone || null}, ${user?.id ?? null}, 'pending') RETURNING id`;
      for (let i = 0; i < processed.length; i++) {
        const image = processed[i];
        await tx`INSERT INTO public.contribution_photos
          (id, contribution_id, sort_order, is_cover, mime_type, contents)
          VALUES (${image.id}, ${record.id}, ${i}, ${i === 0}, 'image/webp', ${image.contents})`;
      }
    });
    return NextResponse.json({
      trackingCode, trackingUrl: "/theo-doi?token=" + encodeURIComponent(token),
      status: "pending", photoCount: processed.length,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Community contribution failed", error);
    const code = (error as { code?: string }).code;
    if (code === "23505") return fail("TRACKING_CONFLICT_RETRY", 409);
    if (code === "23503") return fail("INVALID_CATEGORY", 400);
    return fail("CONTRIBUTION_UNAVAILABLE", 503);
  }
}
