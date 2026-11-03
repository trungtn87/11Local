# 11Local MAP-02 — Neon-only implementation (2026-11-03)

## Decision
- All initial data, including compressed images, in Neon PostgreSQL. No R2, Drive or paid-card dependency.
- Existing dedicated Neon project: `falling-union-71877098`, database `11local`, Singapore, PostgreSQL 17.
- Keep 11Ship and AutoTrade fully isolated.

## Applied database migrations
- `migrations/0001_map02_initial.sql`: categories, places, place_photos, contributions, users, reviews, ownership_claims, moderation_logs. Six categories, no real places.
- `migrations/0002_neon_media_and_public_api.sql`: `place_image_blobs` with `bytea`, MIME whitelist and 300-KiB max/file; `api.public_places` view limited to approved and visible places.
- Neon Data API enabled for schema `api` exclusively. `anonymous` has SELECT on public view, no SELECT on `public.places` or `public.users`. Verified via database permissions and `SET LOCAL ROLE anonymous` query.
- The Neon Data API URL is public routing information (not a secret); no privileged database password is used in the Next.js app.

## Code in feature branch
- `GET /api/places`: server-side proxy through the Neon public Data API, no credentials or mutations, limit 500, rejects bad slug, handles unavailable database.
- MapLibre `MapView` reads the API and draws real geographic markers; empty database -> clear 'no approved places' message (no fake pins).
- `/dia-diem/real/:slug`: detail route for approved Neon places. Legacy `/dia-diem/:id` remains demo.
- Existing search/list UI still uses synthetic demo fixtures; **not yet connected to Neon**.
- The pin-picker in user contribution UI remains a mocked SVG and has no real save/approval integration.

## Images
- Binary storage schema is ready; image upload/moderation/download endpoints are **not** released.
- Image blobs must never be returned through the public Data API.
- No open anonymous upload endpoint: require verified Admin or a moderated submission flow; validate dimensions/MIME, process images to WebP/AVIF, enforce quota and deduplicate before storing.
- This 300 KiB limit is intentionally conservative for Neon Free; replace storage later through adapter without changing place IDs.

## Remaining acceptance criteria
1. CI on final branch SHA must pass before merge.
2. Confirm `/api/places` returns `{ "places": [] }` on a running deployment (there are currently 0 approved places).
3. Verify real map marker/detail with one owner-approved genuine place (do not invent records).
4. Add real bbox/filter search and public list integration to replace demo data.
5. Implement moderated upload and admin workflow before community submissions.
6. Document periodic PostgreSQL backups, image volume caps and retention.

## Security
All public fields are filtered in `api.public_places`. Private tables are outside Neon exposed API schema, not directly queryable by anonymous users. Do not add default grants or place Neon database credentials in the client bundle.