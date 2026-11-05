import { parseSocialUrl } from "./place-social-links";

export type PlaceKind = "business" | "attraction" | "public_place";
export type PlaceInput = {
  name: string; slug: string; categoryId: string; placeKind: PlaceKind;
  summary: string; description: string; address: string; area: string;
  latitude: number; longitude: number; phone: string | null; websiteUrl: string | null; facebookUrl: string | null; youtubeUrl: string | null;
  openingHours: string | null; priceNote: string | null; featuredRank: number | null;
  visibility: "visible" | "hidden"; details: Record<string, unknown>;
  expectedVersion: number | null;
};

export function normalizeSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 128);
}
function isWebsite(raw: string) {
  try { return ["http:", "https:"].includes(new URL(raw).protocol); }
  catch { return false; }
}
export function parsePlaceInput(body: unknown): PlaceInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_INPUT");
  const v = body as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const value = typeof v[key] === "string" ? (v[key] as string).trim() : "";
    if (required && !value) throw new Error(key.toUpperCase() + "_REQUIRED");
    if (value.length > max) throw new Error(key.toUpperCase() + "_TOO_LONG");
    return value;
  };
  const name = text("name", 160, true), slug = normalizeSlug(text("slug", 128) || name);
  if (!slug) throw new Error("INVALID_SLUG");
  const categoryId = text("categoryId", 64, true);
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(categoryId)) throw new Error("INVALID_CATEGORY");
  const kind = v.placeKind === undefined ? (categoryId === "sight" ? "attraction" : "business") : v.placeKind;
  if (kind !== "business" && kind !== "attraction" && kind !== "public_place") throw new Error("INVALID_PLACE_KIND");
  const latitude = v.latitude, longitude = v.longitude;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("INVALID_LATITUDE");
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("INVALID_LONGITUDE");
  const websiteUrl = text("websiteUrl", 500) || null;
  if (websiteUrl && !isWebsite(websiteUrl)) throw new Error("INVALID_WEBSITE_URL");
  const facebookUrl = parseSocialUrl(text("facebookUrl", 500), "facebook");
  const youtubeUrl = parseSocialUrl(text("youtubeUrl", 500), "youtube");
  const featuredRank = v.featuredRank === undefined || v.featuredRank === null || v.featuredRank === "" ? null : v.featuredRank;
  if (featuredRank !== null && (typeof featuredRank !== "number" || !Number.isInteger(featuredRank) || featuredRank < 1 || featuredRank > 10000)) throw new Error("INVALID_FEATURED_RANK");
  const details = v.details ?? {};
  if (!details || typeof details !== "object" || Array.isArray(details)) throw new Error("INVALID_DETAILS");
  const expectedVersion = v.expectedVersion ?? null;
  if (expectedVersion !== null && (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1)) throw new Error("INVALID_VERSION");
  return {
    name, slug, categoryId, placeKind: kind,
    summary: text("summary", 350), description: text("description", 5000),
    address: text("address", 500, true), area: text("area", 120, true),
    latitude, longitude, phone: text("phone", 40) || null, websiteUrl, facebookUrl, youtubeUrl,
    openingHours: text("openingHours", 500) || null,
    priceNote: text("priceNote", 300) || null,
    featuredRank: featuredRank as number | null,
    visibility: v.visibility === "hidden" ? "hidden" : "visible",
    details: details as Record<string, unknown>,
    expectedVersion,
  };
}
export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000, rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng/2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
