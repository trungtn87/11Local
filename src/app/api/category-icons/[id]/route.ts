import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return new Response(null, { status: 404 });
  try {
    const [row] = await db()`SELECT contents FROM public.category_icon_blobs WHERE id = ${id}`;
    if (!row) return new Response(null, { status: 404 });
    return new NextResponse(new Uint8Array(row.contents), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Category icon read failed", error);
    return new Response(null, { status: 503 });
  }
}
