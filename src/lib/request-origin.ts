/**
 * CSRF protection for cookie-authenticated writes behind an HTTPS proxy.
 * Prefer the canonical public SITE_URL; a matching public Host is also a
 * same-origin browser request even when a reverse proxy rewrites Request.url.
 * Never use client-provided X-Forwarded-Host as an authorization source.
 */
function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) ||
        url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function requestHostMatchesOrigin(request: Request, browserOrigin: URL): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    // Reject Host header lists, malformed hosts and URL-like values.
    const normalized = new URL("https://" + host);
    if (normalized.host !== host || normalized.pathname !== "/" ||
        normalized.username || normalized.password || normalized.search || normalized.hash)
      return false;
    if (normalized.host !== browserOrigin.host) return false;
    // Production writes must originate over HTTPS. HTTP local dev remains usable.
    return browserOrigin.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && browserOrigin.protocol === "http:");
  } catch {
    return false;
  }
}

export function isAllowedRequestOrigin(request: Request, requireOrigin = false): boolean {
  const supplied = request.headers.get("origin");
  if (!supplied) return !requireOrigin;
  const origin = canonicalOrigin(supplied);
  if (!origin || supplied !== origin) return false;

  // Production OAuth and web UI use the canonical 11local.vn domain. The proxy
  // may forward an internal Host and deployments may have a stale SITE_URL.
  if (process.env.NODE_ENV === "production" && origin === "https://11local.vn") return true;
\n  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    const expected = canonicalOrigin(configured);
    if (!expected) return false;
    if (origin === expected) return true;
  }

  // Host is the actual HTTP request authority. Unlike X-Forwarded-Host,
  // browsers cannot set it independently of the requested destination.
  if (requestHostMatchesOrigin(request, new URL(origin))) return true;

  // Compatibility with local/dev or providers that omit Host on Request.
  // A configured public SITE_URL must not fall back to an internal URL.
  return !configured && origin === new URL(request.url).origin;
}
