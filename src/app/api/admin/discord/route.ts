import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { listDiscordNotificationHistory } from "@/lib/discord-outbox";
import { isDiscordEnabled } from "@/lib/discord-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers });
  }
  try {
    const history = await listDiscordNotificationHistory();
    return NextResponse.json({
      enabled: isDiscordEnabled(),
      configured: Boolean(process.env.DISCORD_WEBHOOK_URL),
      history,
    }, { headers });
  } catch {
    return NextResponse.json({ error: "DISCORD_HISTORY_UNAVAILABLE" }, { status: 503, headers });
  }
}
