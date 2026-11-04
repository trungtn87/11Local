import { parseNewPlaceContribution } from "./contribution-input";
import { normalizeSlug } from "./place-input";

export type ReviewPlace = {
  name: string; categoryId: string; address: string; area: string;
  latitude: number; longitude: number; description: string; phone: string;
  openingHours: string; summary: string; websiteUrl: string;
  priceNote: string; placeKind: "business" | "attraction" | "public_place";
  details: Record<string, unknown>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string) { return UUID_RE.test(value); }
export function canReview(status: unknown) { return status === "pending" || status === "needs_info"; }

export function parseReviewPlace(value: unknown): ReviewPlace {
  const base = parseNewPlaceContribution(value);
  const raw = value as Record<string, unknown>;
  function optional(key: string, max: number) {
    const text = typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
    if (text.length > max) throw new Error(key.toUpperCase() + "_TOO_LONG");
    return text;
  }
  const summary = optional("summary", 350);
  const websiteUrl = optional("websiteUrl", 500);
  const priceNote = optional("priceNote", 300);
  if (websiteUrl) {
    try {
      if (!["https:", "http:"].includes(new URL(websiteUrl).protocol)) throw new Error();
    } catch { throw new Error("INVALID_WEBSITE_URL"); }
  }
  const kind = raw.placeKind ?? (base.categoryId === "sight" ? "attraction" : "business");
  if (!["business", "attraction", "public_place"].includes(String(kind))) throw new Error("INVALID_PLACE_KIND");
  const details = raw.details ?? {};
  if (!details || typeof details !== "object" || Array.isArray(details) || Object.keys(details).length > 100)
    throw new Error("INVALID_DETAILS");
  return {
    name: base.name, categoryId: base.categoryId, address: base.address, area: base.area,
    latitude: base.latitude, longitude: base.longitude, description: base.description,
    phone: base.phone, openingHours: base.openingHours,
    summary, websiteUrl, priceNote,
    placeKind: kind as ReviewPlace["placeKind"], details: details as Record<string, unknown>,
  };
}

export function contributionSlug(name: string, contributionId: string) {
  if (!isUuid(contributionId)) throw new Error("INVALID_ID");
  const base = normalizeSlug(name).slice(0, 115) || "dia-diem";
  return base + "-" + contributionId.replaceAll("-", "").slice(0, 10);
}

export type ReviewDecision = {
  action: "approve" | "reject" | "needs_info";
  expectedVersion: number;
  note: string;
  allowDuplicate: boolean;
  approvedPhotoIds: string[] | null;
  coverPhotoId: string | null;
  place: ReviewPlace | null;
};
export function parseReviewDecision(body: unknown): ReviewDecision {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_INPUT");
  const v = body as Record<string, unknown>;
  if (v.action !== "approve" && v.action !== "reject" && v.action !== "needs_info")
    throw new Error("INVALID_ACTION");
  if (typeof v.expectedVersion !== "number" || !Number.isSafeInteger(v.expectedVersion) ||
      v.expectedVersion < 1) throw new Error("INVALID_VERSION");
  const note = typeof v.note === "string" ? v.note.trim() : "";
  if (note.length > 1200) throw new Error("NOTE_TOO_LONG");
  if (v.action !== "approve" && note.length < 5) throw new Error("REASON_REQUIRED");
  const ids = v.approvedPhotoIds;
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 4 ||
    ids.some(id => typeof id !== "string" || !isUuid(id)) || new Set(ids).size !== ids.length))
    throw new Error("INVALID_PHOTO_SELECTION");
  const coverPhotoId = v.coverPhotoId ?? null;
  if (coverPhotoId !== null && (typeof coverPhotoId !== "string" || !isUuid(coverPhotoId)))
    throw new Error("INVALID_COVER_PHOTO");
  if (Array.isArray(ids) && coverPhotoId && !ids.includes(coverPhotoId))
    throw new Error("COVER_NOT_SELECTED");
  return {
    action: v.action,
    expectedVersion: v.expectedVersion,
    note, allowDuplicate: v.allowDuplicate === true,
    approvedPhotoIds: ids === undefined ? null : ids as string[],
    coverPhotoId,
    place: v.action === "approve" ? parseReviewPlace(v.place) : null,
  };
}
