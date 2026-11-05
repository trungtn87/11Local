/** Optional public links, validated independently of other category fields. */
export type SocialPlatform = "facebook" | "youtube";
const HOSTS: Record<SocialPlatform, ReadonlySet<string>> = {
  facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "fb.watch"]),
  youtube: new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]),
};

export function isSocialUrl(raw: string, platform: SocialPlatform): boolean {
  try {
    const url = new URL(raw);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password && HOSTS[platform].has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parseSocialUrl(value: string, platform: SocialPlatform): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500 || !isSocialUrl(trimmed, platform)) {
    throw new Error("INVALID_" + platform.toUpperCase() + "_URL");
  }
  return trimmed;
}

export function safeSocialUrl(value: unknown, platform: SocialPlatform): string | null {
  return typeof value === "string" && value.length <= 500 && isSocialUrl(value, platform)
    ? value : null;
}
