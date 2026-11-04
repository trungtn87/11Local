/**
 * CSRF origin guard for write endpoints behind an HTTPS reverse proxy.
 *
 * A proxied Next.js request URL can use the internal service hostname.
 * SITE_URL is the public, trusted HTTPS origin configured at deployment.
 * Never infer an allowed origin from client-controlled X-Forwarded-* headers.
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

export function isAllowedRequestOrigin(request: Request, requireOrigin = false): boolean {
  const supplied = request.headers.get("origin");
  if (!supplied) return !requireOrigin;
  const origin = canonicalOrigin(supplied);
  // Origin is serialized without a path or trailing slash by browsers.
  if (!origin || supplied !== origin) return false;

  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    const expected = canonicalOrigin(configured);
    return expected !== null && origin === expected;
  }

  // Keep development / unconfigured deployments' existing same-origin rule.
  return origin === new URL(request.url).origin;
}
