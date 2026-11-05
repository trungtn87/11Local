import type { MapPlace } from "./place-marker";

// Parse the public /api/places result without trusting coordinates or arbitrary API fields.
export type MapReferencePlace = MapPlace & {
  slug: string;
  latitude: number;
  longitude: number;
  moderation_status?: string;
  visibility?: string;
};

function optionalText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function parseMapReferencePlaces(payload: unknown): MapReferencePlace[] {
  if (!payload || typeof payload !== "object" || !("places" in payload)) return [];
  const rows = (payload as { places: unknown }).places;
  if (!Array.isArray(rows)) return [];

  const result: MapReferencePlace[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const place = row as Record<string, unknown>;
    if (typeof place.slug !== "string" || !place.slug.trim() ||
        typeof place.name !== "string" || !place.name.trim() ||
        place.latitude == null || place.longitude == null) continue;
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) continue;
    result.push({
      slug: place.slug,
      name: place.name,
      latitude,
      longitude,
      category_id: optionalText(place.category_id),
      category_name: optionalText(place.category_name),
      category_icon: optionalText(place.category_icon),
      ...(optionalText(place.moderation_status) ? { moderation_status: String(place.moderation_status) } : {}),
      ...(optionalText(place.visibility) ? { visibility: String(place.visibility) } : {}),
    });
  }
  return result;
}
