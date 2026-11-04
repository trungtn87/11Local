import { db } from "@/lib/db";
import { isPossibleDuplicate, distanceMeters } from "@/lib/contribution-input";
import type { NewPlaceContribution } from "@/lib/contribution-input";

type DuplicateResult = {
  matches: { id: string; slug: string; name: string; distanceMeters: number }[];
  pendingNearby: boolean;
  hasDuplicate: boolean;
};

// Bound the geo candidate set before matching names. Pending submissions are NOT disclosed.
export async function findContributionDuplicates(input: Pick<NewPlaceContribution, "name" | "latitude" | "longitude">): Promise<DuplicateResult> {
  const sql = db();
  const lat = input.latitude, lng = input.longitude;
  const [published, pending] = await Promise.all([
    sql`SELECT id, slug, name, latitude, longitude FROM public.places
      WHERE moderation_status = 'approved' AND visibility = 'visible'
        AND latitude BETWEEN ${lat - 0.01} AND ${lat + 0.01}
        AND longitude BETWEEN ${lng - 0.01} AND ${lng + 0.01}
      LIMIT 100`,
    sql`SELECT payload->>'name' AS name, payload->>'latitude' AS lat,
        payload->>'longitude' AS lng
      FROM public.contributions
      WHERE kind = 'new_place' AND moderation_status IN ('pending','needs_info')
        AND (payload->>'latitude') ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND (payload->>'longitude') ~ '^-?[0-9]+(\\.[0-9]+)?$'
        AND (payload->>'latitude')::double precision BETWEEN ${lat - 0.01} AND ${lat + 0.01}
        AND (payload->>'longitude')::double precision BETWEEN ${lng - 0.01} AND ${lng + 0.01}
      ORDER BY created_at DESC LIMIT 100`,
  ]);
  const matches = published.filter(p => isPossibleDuplicate(
    input.name, lat, lng, String(p.name), Number(p.latitude), Number(p.longitude),
  )).map(p => ({
    id: String(p.id), slug: String(p.slug), name: String(p.name),
    distanceMeters: Math.round(distanceMeters(lat, lng, Number(p.latitude), Number(p.longitude))),
  }));
  const pendingNearby = pending.some(p => isPossibleDuplicate(
    input.name, lat, lng, String(p.name ?? ""), Number(p.lat), Number(p.lng),
  ));
  return { matches, pendingNearby, hasDuplicate: matches.length > 0 || pendingNearby };
}
