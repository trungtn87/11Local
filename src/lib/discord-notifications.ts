/**
 * Discord transport and safe, minimal administrative messages.
 * Server-only: never import this module into a client component.
 */
export const DISCORD_EVENT_TYPES = [
  "contribution", "ownership", "moderation", "system", "digest", "test",
] as const;

export type DiscordEventType = (typeof DISCORD_EVENT_TYPES)[number];

export interface DiscordNotification {
  type: DiscordEventType;
  title: string;
  description: string;
  actionPath?: string | null;
}

export type DeliveryResult =
  | { kind: "sent"; httpStatus: number }
  | { kind: "retry"; reason: string; httpStatus: number | null; retryAfterMs?: number }
  | { kind: "permanent"; reason: string; httpStatus: number };

const colors: Record<DiscordEventType, number> = {
  contribution: 0xf0b232,
  ownership: 0xf0b232,
  moderation: 0x3498db,
  system: 0xe74c3c,
  digest: 0x2ecc71,
  test: 0x5865f2,
};

export function isDiscordEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.DISCORD_NOTIFICATIONS_ENABLED === "true";
}

export function validateDiscordWebhook(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("INVALID_DISCORD_WEBHOOK"); }
  if (url.protocol !== "https:" || url.hostname !== "discord.com" ||
      url.port || url.username || url.password || url.search || url.hash ||
      !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)) {
    throw new Error("INVALID_DISCORD_WEBHOOK");
  }
  return url;
}

export function validateDiscordNotification(value: DiscordNotification): DiscordNotification {
  if (!DISCORD_EVENT_TYPES.includes(value.type)) throw new Error("INVALID_DISCORD_EVENT_TYPE");
  const title = value.title?.trim();
  const description = value.description?.trim();
  if (!title || title.length > 200 || !description || description.length > 1500) {
    throw new Error("INVALID_DISCORD_MESSAGE");
  }
  if (value.actionPath && !/^\/admin(?:\/[A-Za-z0-9_-]+)*\/?$/.test(value.actionPath)) {
    throw new Error("INVALID_DISCORD_ACTION_PATH");
  }
  return { type: value.type, title, description, actionPath: value.actionPath || null };
}

export function buildDiscordPayload(event: DiscordNotification, siteUrl?: string) {
  const message = validateDiscordNotification(event);
  let url: string | undefined;
  if (siteUrl && message.actionPath) {
    try {
      const origin = new URL(siteUrl);
      if (origin.protocol === "https:" || (origin.protocol === "http:" && origin.hostname === "localhost")) {
        url = new URL(message.actionPath, origin.origin).toString();
      }
    } catch { /* Missing/invalid SITE_URL must not expose a guessed link. */ }
  }
  return {
    username: "11Local",
    allowed_mentions: { parse: [] as string[] },
    embeds: [{
      title: message.title,
      description: message.description,
      color: colors[message.type],
      ...(url ? { url } : {}),
      footer: { text: "11Local • Thông báo quản trị" },
    }],
  };
}

export function retryDelayMs(attempt: number, retryAfterMs?: number) {
  const base = Math.min(3_600_000, 15_000 * 2 ** Math.max(0, attempt - 1));
  return Math.min(3_600_000, Math.max(base, retryAfterMs || 0));
}

export async function sendDiscordWebhook(
  webhook: string,
  event: DiscordNotification,
  siteUrl?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeliveryResult> {
  const url = validateDiscordWebhook(webhook);
  url.searchParams.set("wait", "true");
  const payload = buildDiscordPayload(event, siteUrl);
  try {
    const response = await fetchImpl(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (response.ok) return { kind: "sent", httpStatus: response.status };
    const reason = `DISCORD_HTTP_${response.status}`;
    if (response.status === 429 || response.status === 408 || response.status >= 500) {
      const retryAfterHeader = Number(response.headers.get("retry-after"));
      const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? Math.ceil(retryAfterHeader * 1000) : undefined;
      return { kind: "retry", reason, httpStatus: response.status, retryAfterMs };
    }
    return { kind: "permanent", reason, httpStatus: response.status };
  } catch {
    // Never log the exception: transport errors can embed the secret URL.
    return { kind: "retry", reason: "DISCORD_NETWORK_ERROR", httpStatus: null };
  }
}
