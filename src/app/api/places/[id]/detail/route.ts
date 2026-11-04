import { NextResponse } from "next/server";
import { getPublishedPlaceDetail } from "@/lib/public-place-detail";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/** Same approved detail read as the shareable SSR page. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
  }
  try {
    const place = await getPublishedPlaceDetail(slug);
    if (!place) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404, headers });
    return NextResponse.json({ place }, { headers });
  } catch (error) {
    console.error("11Local V2 place detail read failed", error);
    return NextResponse.json({ error: "DETAIL_UNAVAILABLE" }, { status: 503, headers });
  }
}
