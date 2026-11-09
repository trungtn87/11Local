import {invalidateFamilyPublic} from "@/lib/family";
import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {parseMemoryContribution} from "@/lib/family-contribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class ContributionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const response = (error: string, status: number) => NextResponse.json({error}, {status,headers:{"Cache-Control":"no-store"}});

// A single transaction creates the album, map pin and timeline item.
// Account approval is mandatory; new memories publish without a moderation queue.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return response("Tài khoản Google cần được Admin duyệt trước khi đóng góp", 401);
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) return response("Chỉ nhận JSON", 415);
  if (Number(request.headers.get("content-length") || 0) > 16_384) return response("Dữ liệu quá lớn", 413);
  const input = await request.json().catch(() => null);
  const parsed = parseMemoryContribution(input);
  if ("error" in parsed) return response(parsed.error, 400);
  const {request_id,album,place,milestone} = parsed.data;
  try {
    const result = await db().begin(async tx => {
      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [user.id]);
      // Return the same linked records on retries after a network failure.
      const prior = await tx.unsafe(
        "SELECT album_id::text,place_id::text,milestone_id::text FROM family_contribution_batches WHERE user_id::text=$1 AND request_id::text=$2",
        [user.id,request_id]
      );
      if (prior.length) return {album_id:prior[0].album_id as string,place_id:prior[0].place_id as string|null,milestone_id:prior[0].milestone_id as string|null};
      let albumId: string;
      if (album.mode==="existing") {
        const rows=await tx.unsafe("SELECT id::text FROM family_albums WHERE id::text=$1 AND archived_at IS NULL",[album.id]);
        if (!rows.length) throw new ContributionError("Album không tồn tại hoặc đã lưu trữ",404);
        albumId=String(rows[0].id);
      } else {
        const rows=await tx.unsafe(
          "INSERT INTO family_albums(title,description,event_date,created_by) VALUES($1,$2,$3::date,$4::uuid) RETURNING id::text",
          [album.title,album.description,album.event_date,user.id]);
        albumId=String(rows[0].id);
      }
      let placeId: string|null=null;
      if (place.mode==="existing") {
        const rows=await tx.unsafe("SELECT id::text FROM family_places WHERE id::text=$1",[place.id]);
        if (!rows.length) throw new ContributionError("Không tìm thấy địa điểm",404);
        placeId=String(rows[0].id);
      } else if (place.mode==="new") {
        const rows=await tx.unsafe(
          "INSERT INTO family_places(title,latitude,longitude,visited_on,album_id,created_by) VALUES ($1,$2,$3,$4::date,$5::uuid,$6::uuid) RETURNING id::text",
          [place.title,place.latitude,place.longitude,place.visited_on,albumId,user.id]);
        placeId=String(rows[0].id);
      }
      let milestoneId: string|null=null;
      if (milestone.mode==="existing") {
        const rows=await tx.unsafe("SELECT id::text FROM family_milestones WHERE id::text=$1",[milestone.id]);
        if (!rows.length) throw new ContributionError("Không tìm thấy cột mốc",404);
        milestoneId=String(rows[0].id);
      } else if (milestone.mode==="new") {
        const rows=await tx.unsafe(
          "INSERT INTO family_milestones(title,details,event_date,album_id,created_by) VALUES ($1,$2,$3::date,$4::uuid,$5::uuid) RETURNING id::text",
          [milestone.title,milestone.details,milestone.event_date,albumId,user.id]);
        milestoneId=String(rows[0].id);
      }
      if (placeId) {
        // One location may have memories from many visits and albums.
        await tx.unsafe(
          "INSERT INTO family_place_albums(place_id,album_id) VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING",
          [placeId,albumId]);
      }
      await tx.unsafe(
        "INSERT INTO family_contribution_batches(user_id,request_id,album_id,place_id,milestone_id) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid)",
        [user.id,request_id,albumId,placeId,milestoneId]);
      return {album_id:albumId,place_id:placeId,milestone_id:milestoneId};
    });
    invalidateFamilyPublic();
    return NextResponse.json({ok:true,...result},{status:201,headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    if (error instanceof ContributionError) return response(error.message,error.status);
    console.error("Family contribution metadata failed",error instanceof Error ? error.name : "unknown");
    return response("Không thể tạo kỷ niệm. Vui lòng thử lại.",500);
  }
}
