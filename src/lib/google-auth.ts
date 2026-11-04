export const OAUTH_STATE_COOKIE = "11local_oauth_state";

// Use the public origin rather than the internal Docker request origin for OAuth.
export function googleOAuthOrigin(requestOrigin: string) {
  if (process.env.NODE_ENV !== "production") return requestOrigin;
  const url = new URL(process.env.SITE_URL || "https://11local.vn");
  if (url.protocol !== "https:" || url.username || url.password || url.search ||
      url.hash || url.pathname !== "/" || url.hostname === "0.0.0.0" || url.port) {
    throw new Error("SITE_URL must be a public HTTPS origin");
  }
  return url.origin;
}

export function googleOAuthCallbackUrl(requestOrigin: string) {
  return new URL("/api/auth/google/callback", googleOAuthOrigin(requestOrigin)).toString();
}


export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || /[\\\x00-\x20]/.test(value)) return "/tai-khoan";
  try {
    const base = "https://11local.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return "/tai-khoan";
    return url.pathname + url.search + url.hash;
  } catch { return "/tai-khoan"; }
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
    process.env.USER_SESSION_SECRET && process.env.USER_SESSION_SECRET.length >= 32 && process.env.DATABASE_URL);
}

export type GoogleTokenInfo = {
  iss?: string; aud?: string; sub?: string; email?: string;
  email_verified?: string; name?: string; picture?: string; exp?: string;
};

export function isValidGoogleIdentity(profile: GoogleTokenInfo, clientId: string, now = Date.now()): profile is GoogleTokenInfo & { sub: string; email: string } {
  const exp = Number(profile.exp);
  return (profile.iss === "https://accounts.google.com" || profile.iss === "accounts.google.com") &&
    profile.aud === clientId && profile.email_verified === "true" &&
    typeof profile.sub === "string" && profile.sub.length > 0 &&
    typeof profile.email === "string" && profile.email.length > 0 &&
    Number.isFinite(exp) && exp > Math.floor(now / 1000);
}
