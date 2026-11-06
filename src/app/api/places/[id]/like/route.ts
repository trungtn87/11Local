import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
type Context = { params: Promise<{ id: string }> };

async function validUser(sql: ReturnType<typeof db>, id: string) {
  const [row] = await sql`SELECT id FROM public.users WHERE id=${id}::uuid AND google_sub IS NOT NULL LIMIT 1`;
  return Boolean(row);
}

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!UUID.test(id)) return fail("INVALID_PLACE", 400);
  try {
    const sql = db();
    const [place] = await sql`SELECT id, like_count FROM api.public_places WHERE id=${id}::uuid LIMIT 1`;
    if (!place) return fail("PLACE_NOT_FOUND", 404);
    const user = await getCurrentUser();
    const authenticated = Boolean(user && UUID.test(user.id) && await validUser(sql, user.id));
    const [mine] = authenticated && user
      ? await sql`SELECT 1 FROM public.place_likes WHERE place_id=${id}::uuid AND user_id=${user.id}::uuid LIMIT 1`
      : [];
    return NextResponse.json({ authenticated, liked: Boolean(mine),
      likeCount: Number(place.like_count) }, { headers });
  } catch (error) {
    console.error("11Local like lookup failed", error);
    return fail("LIKES_UNAVAILABLE", 503);
  }
}

async function mutate(context: Context, liked: boolean) {
  const { id } = await context.params;
  if (!UUID.test(id)) return fail("INVALID_PLACE", 400);
  const user = await getCurrentUser();
  if (!user || !UUID.test(user.id)) return fail("LOGIN_REQUIRED", 401);
  try {
    const result = await db().begin(async tx => {
      const [account] = await tx`SELECT id FROM public.users WHERE id=${user.id}::uuid
        AND google_sub IS NOT NULL LIMIT 1`;
      if (!account) throw new Error("LOGIN_REQUIRED");
      const [place] = await tx`SELECT id FROM api.public_places WHERE id=${id}::uuid LIMIT 1`;
      if (!place) throw new Error("PLACE_NOT_FOUND");
      if (liked) {
        await tx`INSERT INTO public.place_likes(place_id, user_id)
          VALUES (${id}::uuid,${user.id}::uuid)
          ON CONFLICT (place_id,user_id) DO NOTHING`;
      } else {
        await tx`DELETE FROM public.place_likes WHERE place_id=${id}::uuid AND user_id=${user.id}::uuid`;
      }
      const [current] = await tx`SELECT count(*)::bigint AS count FROM public.place_likes WHERE place_id=${id}::uuid`;
      return { liked, likeCount: Number(current.count) };
    });
    return NextResponse.json(result, { headers });
  } catch (error) {
    if ((error as Error).message === "LOGIN_REQUIRED") return fail("LOGIN_REQUIRED", 401);
    if ((error as Error).message === "PLACE_NOT_FOUND") return fail("PLACE_NOT_FOUND", 404);
    console.error("11Local like mutation failed", error);
    return fail("LIKES_UNAVAILABLE", 503);
  }
}

/** Idempotent: a Google account can hold at most one like on one place. */
export async function PUT(_request: Request, context: Context) {
  return mutate(context, true);
}
export async function DELETE(_request: Request, context: Context) {
  return mutate(context, false);
}
