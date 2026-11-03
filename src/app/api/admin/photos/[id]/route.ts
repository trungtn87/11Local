import { NextResponse } from "next/server"; import { isAdmin } from "@/lib/admin-auth"; import { db } from "@/lib/db";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){if(!await isAdmin())return NextResponse.json({error:"UNAUTHORIZED"},{status:401});const {id}=await params,[row]=await db()`SELECT mime_type,contents FROM place_image_blobs WHERE photo_id=${id}`;if(!row)return NextResponse.json({error:"NOT_FOUND"},{status:404});return new NextResponse(row.contents,{headers:{"Content-Type":row.mime_type,"Cache-Control":"private, max-age=300"}});}

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const sql = db();
  try {
    const [photo] = await sql`SELECT place_id FROM place_photos WHERE id = ${id}`;
    if (!photo) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await sql.begin(async (tx) => {
      // Serialize cover selection per place: a place has at most one chosen cover.
      await tx`SELECT id FROM places WHERE id = ${photo.place_id} FOR UPDATE`;
      await tx`UPDATE place_photos SET photo_type = 'gallery'
        WHERE place_id = ${photo.place_id} AND id <> ${id} AND photo_type = 'cover'`;
      await tx`UPDATE place_photos SET photo_type = 'cover', moderation_status = 'approved'
        WHERE id = ${id} AND place_id = ${photo.place_id}`;
      await tx`UPDATE places SET updated_at = now() WHERE id = ${photo.place_id}`;
      await tx`INSERT INTO moderation_logs (entity_type, entity_id, action, reason)
        VALUES ('photo', ${id}, 'selected_cover', 'Admin selected place cover photo')`;
    });
    return NextResponse.json({ ok: true, photo_id: id });
  } catch (error) {
    console.error("Admin select cover photo failed", error);
    return NextResponse.json({ error: "SELECT_COVER_FAILED" }, { status: 500 });
  }
}
