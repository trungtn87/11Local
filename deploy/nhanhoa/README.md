# 11Local — Nhân Hòa GitHub deployment

This deployment runs **11Local independently of AutoTrade**. Neon remains the database. Nothing here requires changes to the AutoTrade process, schema, credentials or ports.

## Resource budget (initial cap; benchmark before increasing)

| Component | Runtime RAM | CPU |
| --- | ---: | --- |
| AutoTrade engine | Reserve roughly 1024 MiB initially, then follow actual metrics | Priority |
| 11Local Next.js | **640 MiB maximum**, around 256 MiB reservation | **0.35 vCPU** maximum |
| Linux, Nginx, agents | About 384 MiB headroom | Shared |

This is a budget, not a measurement. 11Local's heap is intentionally capped at 384 MiB to leave room for native allocations such as Sharp. If the app is killed due to memory or responses become slow, collect measurements before increasing the cap.

**Important: Build and runtime are different processes.** Next.js production builds can require much more CPU and RAM than a running app. GitHub integration is welcome **only if Nhân Hòa builds outside this shared VPS**. Ask the panel/provider where the build runs. If it builds directly on the same 1-vCPU / 2-GB VPS, do **not** enable auto-build there while AutoTrade is live; build from GitHub Actions or a separate builder and deploy only the completed artifact/image.

## Preferred: Nhân Hòa project deployment from GitHub

1. Connect `trungtn87/11Local`, branch `main`, to a **new independent Node.js project** in Nhân Hòa, not the AutoTrade project.
2. If the builder supports standard Node projects, use Node **22**, build command `npm ci && npm run check`, start command `npm run start`. Keep `DEPLOY_STANDALONE` **unset**. This is compatible with the current Render deployment.
3. In Nhân Hòa's project resource settings, cap **CPU at 0.35 of a core** and **RAM at 640 MiB** for the *running app*. Reserve at least 384 MiB for host services and protect AutoTrade according to measured utilization.
4. Configure app environment variables in the **project's secret manager**, not GitHub or a committed file:
   - `DATABASE_URL` (11Local Neon only)
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET` (at least 32 characters)
   - `USER_SESSION_SECRET` (at least 32 characters)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SITE_URL` (canonical HTTPS origin)
   - `NEXT_PUBLIC_MAP_STYLE_URL` (optional build-time configuration)
5. Configure an independent app port (example `3101` on localhost) and HTTPS reverse proxy. It must forward `Host`, `X-Forwarded-Proto`, `X-Forwarded-Host`; do not expose the Node port to the internet. Do not bind an AutoTrade port.
6. **Do not move the production domain yet.** First test through a dedicated HTTPS test hostname. With Google OAuth, authorize the exact test callback `https://TEST-HOST/api/auth/google/callback` in Google's OAuth console, and verify that cookies work securely behind the proxy.
7. Verify the real Neon DB, published place detail, images, search, map, Admin, community contributions, reviews and ownership flows.
8. Observe CPU, RAM, OOM restarts, AutoTrade latency and 11Local p95 response times before routing traffic to Nhân Hòa. Keep Render serving the live site until acceptance.

If Nhân Hòa provides only a **Docker-from-GitHub** builder, use `deploy/nhanhoa/Dockerfile` and configure `SITE_URL` as a **build argument and runtime environment variable**. The Next.js standalone output is enabled **only** in this build. The optional `deploy/nhanhoa/compose.yml` is a **runtime** example that consumes an image already built elsewhere, and enforces CPU/RAM limits.

## Health and rollback

- Liveness: `GET /robots.txt` should return HTTP 200. This only proves Node is serving requests.
- Readiness: `GET /api/places` should return HTTP 200 and read published data from the **11Local** Neon instance. In a blank DB, a valid empty `places` array is acceptable.
- Existing published place: `/dia-diem/SLUG` returns HTTP 200, rendered name/description and approved images.
- Unpublished/hidden place: not in sitemap and not publicly readable.
- Google OAuth: redirect URI, user session cookies and Admin permissions unchanged.
- Rollback: revert the Nhân Hòa project to the previous known-good release; if switching a public hostname, return DNS/reverse proxy traffic to Render. Do not migrate, reset or copy Neon data.

## Prohibited actions during rollout

Do not restart AutoTrade, change its variables, share its Postgres credentials, launch build jobs on the production trading VPS, disable its health checks, or automatically switch the live DNS before the independent 11Local smoke test passes.
