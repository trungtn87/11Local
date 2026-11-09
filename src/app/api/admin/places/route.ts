import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/family-contribution";
import { parseMapPlace, type MapPlaceInput } from "@/lib/map-place";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

async function inputBody(request: Request) {
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) return null;
  if (Number(request.headers.get("content-length") || "0") > 32768) return null;
  const input: unknown = await request.json().catch(() => null);
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : null;
}

export async function GET() {
  if (!(await isAdmin())) return fail("Không có quyền quản trị", 401);
  try {
    const [places, albums] = await Promise.all([
      db().unsafe(`SELECT p.id::text,p.title,p.description,p.address,p.latitude,p.longitude,p.category,p.kind,
        p.visibility,p.visited_on::text,p.archived_at::text,
        ARRAY(SELECT l.album_id::text FROM family_place_albums l
          WHERE l.place_id=p.id ORDER BY l.created_at ASC) AS album_ids
        FROM family_places p ORDER BY p.created_at DESC LIMIT 2000`),
      db().unsafe("SELECT id::text,title FROM family_albums WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 1000"),
    ]);
    return NextResponse.json({ places, albums }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("Không tải được địa điểm. Kiểm tra migration 0027.", 500);
  }
}

async function replaceAlbums(tx: ReturnType<typeof db>, placeId: string, data: MapPlaceInput) {
  if (data.album_ids.length) {
    const rows = await tx.unsafe(
      "SELECT count(*)::int AS n FROM family_albums WHERE id::text = ANY($1::text[]) AND archived_at IS NULL",
      [data.album_ids]);
    if (Number(rows[0]?.n) !== data.album_ids.length) throw new Error("INVALID_ALBUM");
  }
  await tx.unsafe("DELETE FROM family_place_albums WHERE place_id::text=$1", [placeId]);
  for (const albumId of data.album_ids) {
    await tx.unsafe(
      "INSERT INTO family_place_albums(place_id,album_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING",
      [placeId, albumId]);
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return fail("Không có quyền quản trị", 401);
  const body = await inputBody(request);
  if (!body) return fail("Yêu cầu không hợp lệ");
  const parsed = parseMapPlace(body);
  if ("error" in parsed) return fail(parsed.error);
  const data = parsed.data;
  try {
    const id = await db().begin(async tx => {
      const rows = await tx.unsafe(
        `INSERT INTO family_places(title,description,address,latitude,longitude,category,kind,visibility,visited_on,album_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10::uuid) RETURNING id::text`,
        [data.title,data.description,data.address,data.latitude,data.longitude,data.category,data.kind,
          data.visibility,data.visited_on,data.album_ids[0] ?? null]);
      const placeId = String(rows[0].id);
      await replaceAlbums(tx as ReturnType<typeof db>, placeId, data);
      return placeId;
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch {
    return fail("Không thể thêm địa điểm. Kiểm tra album và migration 0027.", 400);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return fail("Không có quyền quản trị", 401);
  const body = await inputBody(request);
  if (!body || !isUuid(body.id)) return fail("ID địa điểm không hợp lệ");
  const id = body.id;
  if (body.restore === true) {
    try {
      const rows = await db().unsafe("UPDATE family_places SET archived_at=NULL WHERE id::text=$1 RETURNING id", [id]);
      return rows.length ? NextResponse.json({ ok: true }) : fail("Không tìm thấy địa điểm", 404);
    } catch {
      return fail("Không thể khôi phục địa điểm", 500);
    }
  }
  const parsed = parseMapPlace(body);
  if ("error" in parsed) return fail(parsed.error);
  const data = parsed.data;
  try {
    const changed = await db().begin(async tx => {
      const rows = await tx.unsafe(
        `UPDATE family_places SET title=$1,description=$2,address=$3,latitude=$4,longitude=$5,
          category=$6,kind=$7,visibility=$8,visited_on=$9::date,album_id=$10::uuid
          WHERE id::text=$11 AND archived_at IS NULL RETURNING id`,
        [data.title,data.description,data.address,data.latitude,data.longitude,data.category,data.kind,
          data.visibility,data.visited_on,data.album_ids[0] ?? null,id]);
      if (!rows.length) return false;
      await replaceAlbums(tx as ReturnType<typeof db>, id, data);
      return true;
    });
    return changed ? NextResponse.json({ ok: true }) : fail("Không tìm thấy địa điểm", 404);
  } catch {
    return fail("Không thể cập nhật địa điểm. Kiểm tra album liên quan.", 400);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return fail("Không có quyền quản trị", 401);
  const body = await inputBody(request);
  if (!body || !isUuid(body.id)) return fail("ID địa điểm không hợp lệ");
  try {
    // Archive instead of deleting photo links or historical family visits.
    const rows = await db().unsafe(
      "UPDATE family_places SET archived_at=now(),visibility=false WHERE id::text=$1 AND archived_at IS NULL RETURNING id",
      [body.id]);
    return rows.length ? NextResponse.json({ ok: true }) : fail("Không tìm thấy địa điểm", 404);
  } catch {
    return fail("Không thể lưu trữ địa điểm", 500);
  }
}
