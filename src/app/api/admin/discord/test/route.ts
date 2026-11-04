import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  dispatchDiscordOutbox, enqueueDiscordTest, getDiscordNotificationStatus,
} from "@/lib/discord-outbox";
import { isDiscordEnabled, validateDiscordWebhook } from "@/lib/discord-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers });

export async function POST(request: Request) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("INVALID_ORIGIN", 403);
  if (!isDiscordEnabled() || !process.env.DISCORD_WEBHOOK_URL) {
    return fail("DISCORD_NOT_CONFIGURED", 503);
  }
  try { validateDiscordWebhook(process.env.DISCORD_WEBHOOK_URL); }
  catch { return fail("DISCORD_NOT_CONFIGURED", 503); }
  try {
    const queued = await enqueueDiscordTest();
    await dispatchDiscordOutbox(1, queued.id);
    const current = await getDiscordNotificationStatus(queued.id);
    return NextResponse.json({
      id: queued.id,
      status: current?.status ?? "processing",
      sent: current?.status === "sent",
    }, { status: current?.status === "sent" ? 200 : 502, headers });
  } catch {
    // Deliberately no exception logging: webhook credentials must not be exposed.
    return fail("DISCORD_TEST_UNAVAILABLE", 503);
  }
}
