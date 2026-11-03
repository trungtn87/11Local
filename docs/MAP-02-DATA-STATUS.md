# MAP-02 — Data foundation status (2026-11-03)

Dedicated Neon project: `falling-union-71877098` (PostgreSQL 17; Singapore), database `11local`.

## Implemented
- Eight tables: `categories`, `places`, `place_photos`, `contributions`, `users`, `reviews`, `ownership_claims`, `moderation_logs`.
- Initial six category rows.
- Latitude and longitude validation, approval/visibility filters, supporting indexes.
- Migration: `migrations/0001_map02_initial.sql`. Applied successfully to dedicated Neon database and read back (8 tables, 6 categories, 0 places).

## NOT implemented yet
- Public geospatial endpoint and MapLibre markers; existing UI remains preview/demo.
- R2 bucket and image upload. Cloudflare API returns error 10042: **enable R2 in Cloudflare Dashboard**. Do not claim R2 configured.
- Render database environment variable. Never expose credentials in source control, public client bundles or logs.
- Authentication, review/claim/moderation backend. Schema does not constitute enabled business flows.

## Safety rules
- Public map API must return only `moderation_status='approved'` AND `visibility='visible'`.
- Client cannot write directly to database. All mutations go via authenticated/verified API and Admin moderation.
- Default `moderation_status='pending'`; never auto-publish new contributions.
- Photo uploads should be private pending review; R2 credentials server-side only, object keys stored in `place_photos`.
- No automatic transfer, mutation, or sharing of 11Ship/AutoTrade data.
- Add dedicated database role with SELECT on approved-public content only or enforce server query whitelist; avoid using owner credentials in production.

## Next delivery
1. Enable R2, create `11local-images` private bucket.
2. Implement Next.js API `/api/places` with server-only Neon driver and map bbox query.
3. MapLibre points from real `longitude,latitude` + open detail by slug.
4. Add test fixtures as pending or staging-only; load real approved places only after Admin review.
5. Test/build/CI, configure Render secrets, release and smoke-test deployed app.
