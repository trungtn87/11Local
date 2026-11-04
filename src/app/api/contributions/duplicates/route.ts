import { NextResponse } from "next/server";
import { findContributionDuplicates } from "@/lib/contribution-duplicates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const name = (query.get("name") ?? "").trim().slice(0, 160);
  const latValue = query.get("latitude"), lngValue = query.get("longitude");
  const latitude = latValue === null ? NaN : Number(latValue);
  const longitude = lngValue === null ? NaN : Number(lngValue);
  if (name.length < 3 || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  try {
    const result = await findContributionDuplicates({ name, latitude, longitude });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Contribution duplicate lookup failed", error);
    return NextResponse.json({ error: "DUPLICATES_UNAVAILABLE" }, { status: 503 });
  }
}
