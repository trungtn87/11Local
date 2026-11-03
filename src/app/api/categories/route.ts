import { NextResponse } from "next/server";

const NEON_PUBLIC_CATEGORIES_URL =
  "https://ep-steep-glitter-b3ji27kr.apirest.c-4.ap-southeast-1.aws.neon.tech/11local/rest/v1/public_categories";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = new URL(NEON_PUBLIC_CATEGORIES_URL);
  url.searchParams.set("select", "id,name,icon,sort_order");
  url.searchParams.set("order", "sort_order.asc,name.asc");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) {
      console.error("Neon public categories query failed:", response.status);
      return NextResponse.json({ error: "CATEGORIES_UNAVAILABLE" }, { status: 503 });
    }

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "INVALID_CATEGORIES_RESPONSE" }, { status: 502 });
    }

    return NextResponse.json({ categories: rows }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ error: "CATEGORIES_UNAVAILABLE" }, { status: 503 });
  }
}
