import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { parsePlaceInput } from "@/lib/place-input";

const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
export async function GET() {
  if (!await isAdmin()) return unauthorized();
  const rows = await db()`SELECT p.*, c.name AS category_name,
    (SELECT count(*)::int FROM place_photos ph WHERE ph.place_id=p.id) AS photo_count
    FROM places p JOIN categories c ON c.id=p.category_id ORDER BY p.updated_at DESC LIMIT 500`;
  return NextResponse.json({ places: rows }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!await isAdmin()) return unauthorized();
  try {
    const input = parsePlaceInput(await request.json()); const sql = db();
    const existing = await sql`SELECT id,name,address,latitude,longitude FROM places
      WHERE lower(name)=lower(${input.name}) OR (latitude BETWEEN ${input.latitude - .005} AND ${input.latitude + .005} AND longitude BETWEEN ${input.longitude - .005} AND ${input.longitude + .005}) LIMIT 20`;
    if (existing.some((p) => p.name.toLocaleLowerCase("vi") === input.name.toLocaleLowerCase("vi") || distance(p, input) < 100))
      return NextResponse.json({ error: "POSSIBLE_DUPLICATE", matches: existing }, { status: 409 });
    const [place] = await sql`INSERT INTO places (slug,name,category_id,description,address,area,latitude,longitude,phone,opening_hours,price_note,moderation_status,visibility)
      VALUES (${input.slug},${input.name},${input.categoryId},${input.description},${input.address},${input.area},${input.latitude},${input.longitude},${input.phone},${input.openingHours},${input.priceNote},'pending',${input.visibility}) RETURNING *`;
    await sql`INSERT INTO moderation_logs (entity_type,entity_id,action,reason,after_data) VALUES ('place',${place.id},'created_pending','Admin created draft',${sql.json(place)})`;
    return NextResponse.json({ place }, { status: 201 });
  } catch (error) { return apiError(error); }
}
function distance(p: Record<string, unknown>, i: ReturnType<typeof parsePlaceInput>) {
  const rad=(n:number)=>n*Math.PI/180, dlat=rad(i.latitude-Number(p.latitude)), dlng=rad(i.longitude-Number(p.longitude));
  const h=Math.sin(dlat/2)**2+Math.cos(rad(Number(p.latitude)))*Math.cos(rad(i.latitude))*Math.sin(dlng/2)**2;
  return 12742000*Math.asin(Math.sqrt(h));
}
function apiError(error: unknown) {
  const e=error as { message?:string; code?:string };
  if (e.code === "23505") return NextResponse.json({ error: "SLUG_EXISTS" }, { status: 409 });
  if (e.message?.startsWith("DATABASE_URL")) return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  return NextResponse.json({ error: e.message || "INVALID_INPUT" }, { status: 400 });
}
