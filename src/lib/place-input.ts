export const categories = ["food", "cafe", "stay", "sight", "shop", "service"] as const;

export type PlaceInput = {
  name: string; slug: string; categoryId: string; description: string; address: string; area: string;
  latitude: number; longitude: number; phone: string | null; openingHours: string | null; priceNote: string | null;
  visibility: "visible" | "hidden";
};

export function normalizeSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 128);
}

export function parsePlaceInput(body: unknown): PlaceInput {
  const v = body as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const value = typeof v?.[key] === "string" ? v[key].trim() : "";
    if (required && !value) throw new Error(`${key.toUpperCase()}_REQUIRED`);
    if (value.length > max) throw new Error(`${key.toUpperCase()}_TOO_LONG`);
    return value;
  };
  const name = text("name", 160, true);
  const slug = normalizeSlug(text("slug", 128) || name);
  const categoryId = text("categoryId", 32, true);
  const latitude = Number(v?.latitude); const longitude = Number(v?.longitude);
  if (!slug) throw new Error("INVALID_SLUG");
  if (!(categories as readonly string[]).includes(categoryId)) throw new Error("INVALID_CATEGORY");
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("INVALID_LATITUDE");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("INVALID_LONGITUDE");
  return {
    name, slug, categoryId, latitude, longitude, description: text("description", 5000), address: text("address", 500, true),
    area: text("area", 120, true), phone: text("phone", 40) || null, openingHours: text("openingHours", 500) || null,
    priceNote: text("priceNote", 300) || null, visibility: v?.visibility === "hidden" ? "hidden" : "visible",
  };
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000; const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(bLat - aLat); const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng/2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
