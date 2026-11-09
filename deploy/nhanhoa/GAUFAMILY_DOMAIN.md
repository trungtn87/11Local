# Gia đình Gấu — gaufamily.io.vn on Nhân Hòa Vibe

**Canonical domain:** `https://gaufamily.io.vn`
**VPS IP per former 11local.vn DNS record:** `103.159.50.23` (confirm in hosting panel)
**Deployment:** GitHub `main` → manual redeploy from Nhân Hòa Vibe Hosting; this repository does **not** configure Nginx or TLS certificates on the host.

## 1. DNS (ZoneDNS)

- A `@` → `103.159.50.23`, TTL 300, only if the IP still matches the Vibe reverse proxy.
- CNAME `www` → `gaufamily.io.vn`, TTL 300.
- Do not remove any existing `11local.vn` DNS or TLS setup until the new hostname is verified. Check for conflicting A/AAAA/CNAME records.

## 2. Configure the domain and HTTPS **in Nhân Hòa Vibe Hosting**

Find the **Gia đình Gấu / 11Local** application (not AutoTrade). In **Domains / Custom Domains / Domain settings** (label depends on Vibe version):

1. Add `gaufamily.io.vn` and `www.gaufamily.io.vn` to this application. Point both to the existing web service / container port, not to a separate new application.
2. Enable **automatic SSL/TLS / Let's Encrypt** or request certificates for both domains. Confirm that DNS resolves and HTTP validation over TCP/80 can reach Vibe. Choose the canonical domain `gaufamily.io.vn` and redirect `www` to it if supported.
3. Set the application runtime Environment `SITE_URL=https://gaufamily.io.vn`. Do **not** include a trailing slash. Update the **Docker build argument** `SITE_URL` to the same value if Vibe exposes build args. The Dockerfile fallback is now this URL; an old runtime setting takes precedence.
4. Use Vibe's **manual Redeploy / Rebuild from GitHub main**. This is not automatic, and GitHub Actions CI does not deploy to production.
5. Inspect the issued certificate details: the SAN must include the exact hostname. Verify Chrome shows a secure HTTPS connection before logging in.
6. If Vibe has no domain/SSL feature, TLS must be configured in the external reverse proxy (such as host Nginx); GitHub-only source changes cannot issue a certificate on that server. Request support from Nhân Hòa or use an authorized SSH/host admin interface. Do not install another proxy on 80/443 blindly.

## 3. Google OAuth

In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID, add the authorized **redirect URI**:

`https://gaufamily.io.vn/api/auth/google/callback`

If the app uses JavaScript origins, authorize `https://gaufamily.io.vn` too. Keep the previous callback temporarily until end-to-end login succeeds; do not change the client ID/secret unnecessarily.

For the Google OAuth app, update authorized domains, branding links, privacy-policy URL as applicable.

## 4. Verification

- `https://gaufamily.io.vn` loads with a trusted certificate and no browser override.
- `https://www.gaufamily.io.vn` also has valid TLS and redirects to the canonical domain if configured.
- Google login redirects back to `https://gaufamily.io.vn/api/auth/google/callback` and ends on the correct HTTPS origin.
- Album, photos, map, Admin and uploads work under the new origin.
- Check `https://gaufamily.io.vn/robots.txt` and sitemap canonical URLs.
- Monitor VPS resource usage to protect AutoTrade; do not change AutoTrade service/ports or Neon database.

## Rollback

Rollback only the Gia đình Gấu Vibe deployment and restore its previous runtime SITE_URL if necessary. Keep the old Vibe domain binding until new HTTPS and OAuth pass. Never roll back or restart AutoTrade as part of this change.
