import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const MAX_INPUT = 2 * 1024 * 1024;

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let file: FormDataEntryValue | null;
  try { file = (await request.formData()).get("file"); }
  catch { return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 }); }
  if (!(file instanceof File) || !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      || !file.size || file.size > MAX_INPUT) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }
  let contents: Buffer;
  try {
    contents = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 10_000_000 })
      .rotate().resize(128, 128, { fit: "contain", background: "#ffffff00" })
      .webp({ quality: 88 }).toBuffer();
    if (!contents.length) throw new Error("Empty image");
  } catch { return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 }); }

  const id = randomUUID();
  try {
    await db()`INSERT INTO public.category_icon_blobs (id, contents) VALUES (${id}, ${contents})`;
    return NextResponse.json({ icon: "custom:" + id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Category icon upload failed", error);
    return NextResponse.json({ error: "ICON_UPLOAD_FAILED" }, { status: 503 });
  }
}
