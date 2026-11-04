import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin sees every category including those hidden from public discovery.
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const sql = db();
    const [categories, fields] = await Promise.all([
      sql`SELECT id, name, icon, visibility, sort_order
          FROM public.categories ORDER BY sort_order, name`,
      sql`SELECT category_id, field_key, label, field_type, help_text, options, is_required, sort_order
          FROM public.category_fields WHERE is_visible = true
          ORDER BY category_id, sort_order, field_key`,
    ]);
    return NextResponse.json({ categories, fields }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load Admin place catalog", error);
    return NextResponse.json({ error: "PLACE_CATALOG_UNAVAILABLE" }, { status: 503 });
  }
}
