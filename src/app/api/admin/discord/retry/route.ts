import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import {
  dispatchDiscordOutbox, getDiscordNotificationStatus, requeueFailedDiscordNotification,
} from "@/lib/discord-outbox";
import { isDiscordEnabled, validateDiscordWebhook } from "@/lib/discord-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  if (Number(request.headers.get("content-length") ?? 0) > 1000) return fail("REQUEST_TOO_LARGE", 413);
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!isDiscordEnabled() || !webhook) return fail("DISCORD_NOT_CONFIGURED", 503);
  try { validateDiscordWebhook(webhook); }
  catch { return fail("DISCORD_NOT_CONFIGURED", 503); }
  let id: string;
  try {
    const input = await request.json();
    id = typeof input?.id === "string" ? input.id : "";
    if (!UUID.test(id)) return fail("INVALID_ID", 400);
  } catch { return fail("INVALID_INPUT", 400); }
  try {
    const queued = await requeueFailedDiscordNotification(id);
    if (!queued) return fail("NOT_RETRYABLE_OR_DISABLED", 409);
    await dispatchDiscordOutbox(1, queued);
    const current = await getDiscordNotificationStatus(queued);
    return NextResponse.json({ id: queued, status: current?.status ?? "processing" }, {
      status: current?.status === "failed" ? 502 : current?.status === "sent" ? 200 : 202, headers,
    });
  } catch {
    // No exception logging; an HTTP failure may contain the private webhook.
    return fail("DISCORD_RETRY_UNAVAILABLE", 503);
  }
}
