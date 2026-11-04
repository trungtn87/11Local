import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { listDiscordNotificationHistory } from "@/lib/discord-outbox";
import { isDiscordEnabled, validateDiscordWebhook } from "@/lib/discord-notifications";
import { parseDiscordSettingsUpdate } from "@/lib/discord-settings";
import { readDiscordSettings, saveDiscordSettings } from "@/lib/discord-settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

function webhookConfigured(): boolean {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try { validateDiscordWebhook(url); return true; }
  catch { return false; }
}

export async function GET() {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  try {
    const [settings, history] = await Promise.all([
      readDiscordSettings(), listDiscordNotificationHistory(),
    ]);
    return NextResponse.json({
      settings,
      environmentEnabled: isDiscordEnabled(),
      configured: webhookConfigured(),
      history,
    }, { headers });
  } catch {
    return fail("DISCORD_SETTINGS_UNAVAILABLE", 503);
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return fail("UNAUTHORIZED", 401);
  if (Number(request.headers.get("content-length") ?? 0) > 3000) return fail("REQUEST_TOO_LARGE", 413);
  let input: ReturnType<typeof parseDiscordSettingsUpdate>;
  try { input = parseDiscordSettingsUpdate(await request.json()); }
  catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_SETTINGS";
    return fail(code.startsWith("INVALID_") ? code : "INVALID_SETTINGS", 400);
  }
  try {
    const settings = await saveDiscordSettings(input);
    if (!settings) return fail("STALE_VERSION", 409);
    return NextResponse.json({ settings }, { headers });
  } catch {
    return fail("DISCORD_SETTINGS_UNAVAILABLE", 503);
  }
}
