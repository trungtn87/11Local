import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

type SearchResult = { id: string; name: string; latitude: number; longitude: number };
type NominatimItem = { place_id?: number; display_name?: string; lat?: string; lon?: string };

const cached = new Map<string, { expires: number; results: SearchResult[] }>();
let lastRequestAt = 0;
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: noStore });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 120) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400, headers: noStore });
  }

  const key = q.toLocaleLowerCase("vi");
  const hit = cached.get(key);
  if (hit && hit.expires > Date.now()) {
    return NextResponse.json({ results: hit.results }, { headers: noStore });
  }

  // The public Nominatim service prohibits autocomplete and limits use to 1 req/s.
  // This route is admin-only and is called explicitly on Search, not on each keystroke.
  if (Date.now() - lastRequestAt < 1200) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { ...noStore, "Retry-After": "2" } },
    );
  }
  lastRequestAt = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("viewbox", "105.05,23.3,107.4,21.85");
  url.searchParams.set("accept-language", "vi,en");

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "11LocalAdmin/1.0 (+https://github.com/trungtn87/11Local)",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: upstream.status === 429 ? "RATE_LIMITED" : "SEARCH_UNAVAILABLE" },
        { status: upstream.status === 429 ? 429 : 502, headers: noStore },
      );
    }

    const data: unknown = await upstream.json();
    if (!Array.isArray(data)) throw new Error("Unexpected geocoding response");
    const results = (data as NominatimItem[])
      .map((item) => ({
        id: String(item.place_id ?? ""),
        name: String(item.display_name ?? ""),
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      }))
      .filter((item) =>
        item.id && item.name &&
        Number.isFinite(item.latitude) && Number.isFinite(item.longitude) &&
        item.latitude >= -90 && item.latitude <= 90 &&
        item.longitude >= -180 && item.longitude <= 180,
      )
      .slice(0, 6);

    if (cached.size >= 150) cached.delete(cached.keys().next().value ?? "");
    cached.set(key, { expires: Date.now() + 24 * 60 * 60 * 1000, results });
    return NextResponse.json({ results }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "SEARCH_UNAVAILABLE" }, { status: 502, headers: noStore });
  }
}
