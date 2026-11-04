import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dispatchDiscordOutbox } from "@/lib/discord-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

function isAuthorized(request: Request) {
  const secret = process.env.DISCORD_DISPATCH_TOKEN;
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
  }
  try {
    const result = await dispatchDiscordOutbox();
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "DISCORD_DISPATCH_UNAVAILABLE" }, { status: 503, headers });
  }
}
