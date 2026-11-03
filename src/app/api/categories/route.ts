import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db()`
      SELECT id, name, icon, sort_order
      FROM categories
      WHERE visibility = 'visible'
      ORDER BY sort_order, name
    `;
    return NextResponse.json({ categories: rows }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Neon categories query failed", error);
    return NextResponse.json({ error: "CATEGORIES_UNAVAILABLE" }, { status: 503 });
  }
}
