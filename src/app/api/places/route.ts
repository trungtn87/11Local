import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug && !/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "INVALID_SLUG" }, { status: 400 });
  }

  try {
    const sql = db();
    // Query only the security-barrier view. It excludes pending, rejected and hidden places.
    const rows = slug
      ? await sql`SELECT id,slug,name,description,address,area,latitude,longitude,category_id,category_name,ownership_status,phone FROM api.public_places WHERE slug=${slug} ORDER BY name LIMIT 1`
      : await sql`SELECT id,slug,name,description,address,area,latitude,longitude,category_id,category_name,ownership_status,phone FROM api.public_places ORDER BY name LIMIT 500`;
    return NextResponse.json({ places: rows }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Neon public places query failed", error);
    return NextResponse.json({ error: "PLACES_UNAVAILABLE" }, { status: 503 });
  }
}
