import { db } from "@/lib/db";
import type { DiscordSettings, DiscordGroupSettings } from "@/lib/discord-settings";

/** This module runs on the server; Webhook secrets are never stored in Neon. */
export async function readDiscordSettings(): Promise<DiscordSettings> {
  const [row] = await db()`SELECT master_enabled,groups,version,updated_at
    FROM public.discord_notification_settings WHERE id=1`;
  if (!row) throw new Error("DISCORD_SETTINGS_NOT_INITIALIZED");
  return {
    enabled: Boolean(row.master_enabled),
    groups: row.groups as DiscordGroupSettings,
    version: Number(row.version),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function saveDiscordSettings(
  input: Pick<DiscordSettings, "enabled" | "groups" | "version">,
): Promise<DiscordSettings | null> {
  const sql = db();
  const [row] = await sql`UPDATE public.discord_notification_settings
    SET master_enabled=${input.enabled}, groups=${sql.json(input.groups)},
        version=version+1, updated_at=now()
    WHERE id=1 AND version=${input.version}
    RETURNING master_enabled,groups,version,updated_at`;
  if (!row) return null;
  return {
    enabled: Boolean(row.master_enabled),
    groups: row.groups as DiscordGroupSettings,
    version: Number(row.version),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
