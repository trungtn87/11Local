export const OAUTH_STATE_COOKIE = "11local_oauth_state";

// 11Local's production OAuth client is registered on this exact public origin.
// Do not derive it from Docker, proxy headers, or a possibly malformed SITE_URL.
export function googleOAuthOrigin(requestOrigin: string) {
  return process.env.NODE_ENV === "production" ? "https://11local.vn" : requestOrigin;
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
