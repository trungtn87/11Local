import { NextRequest, NextResponse } from "next/server";

// Safe to expose: Data API grants anonymous SELECT on the *filtered public view only*.
// The URL carries no password or privileged token.
const NEON_PUBLIC_PLACES_URL =
  "https://ep-steep-glitter-b3ji27kr.apirest.c-4.ap-southeast-1.aws.neon.tech/11local/rest/v1/public_places";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug && !/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "INVALID_SLUG" }, { status: 400 });
  }

  const url = new URL(NEON_PUBLIC_PLACES_URL);
  url.searchParams.set("select", "id,slug,name,description,address,area,latitude,longitude,category_id,category_name,ownership_status,phone");
  url.searchParams.set("limit", slug ? "1" : "500");
  url.searchParams.set("order", "name.asc");
  if (slug) url.searchParams.set("slug", `eq.${slug}`);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) {
      console.error("Neon public places query failed:", response.status);
      return NextResponse.json({ error: "PLACES_UNAVAILABLE" }, { status: 503 });
    }

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "INVALID_PLACES_RESPONSE" }, { status: 502 });
    }
    // Public view already excludes pending, rejected and hidden locations.
    return NextResponse.json({ places: rows }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch {
    return NextResponse.json({ error: "PLACES_UNAVAILABLE" }, { status: 503 });
  }
}
