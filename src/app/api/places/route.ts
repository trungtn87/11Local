import { NextRequest, NextResponse } from "next/server";
import { getPublicPlaces } from "@/lib/public-catalog";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" };

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (slug && !/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "INVALID_SLUG" }, { status: 400 });
  }
  try {
    return NextResponse.json({ places: await getPublicPlaces(slug ?? undefined) }, { headers });
  } catch (error) {
    console.error("11Local public places query failed", error);
    return NextResponse.json({ error: "PLACES_UNAVAILABLE" }, { status: 503 });
  }
}
