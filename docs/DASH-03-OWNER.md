# DASH-03: Owner / manager dashboard

Depends on DASH-02 (PR #41), including the versioned menu tables. This is a stacked PR targeting `feat/menu-pricing` until that PR is merged. No new migration, table, environment variable or external service.

## Entry points

- `/thong-ke/[id]`: per-place dashboard with links from My Places and the existing owner editor.
- `GET /api/managed-places/[id]/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD`: private, no-store, Vary Cookie.
- Multiple active managed places appear as navigation links; changing place always performs fresh server authorization.

## Reporting rules

- Default last 30 Vietnam calendar days, presets today / 7 / 30 days, custom maximum 366 days.
- Daily views and equal-length previous-period comparison reuse `analytics_daily`. Lifetime views reuse `place_metrics`, including the older counter. No website-wide sessions are exposed.
- Days before the recording start are unmeasured, not fabricated zeros. The first measured day may be partial; percentage comparison is unavailable unless the previous period is fully within measured history. A zero baseline does not produce infinity.
- Current rating average and all five star bins use only approved, non-deleted reviews. Up to ten latest public reviews return content, stars and date; no reviewer identifier or contact data.
- Current status counts and thirty latest updates include only the current account's owner-sourced information revisions, uploaded photos and menu revisions for this place. Other managers' revisions, community contributions, claims/evidence and private reviews are excluded.
- Menu reminders use the approved snapshot's publication time, not draft changes: missing/current/90-days-outdated, plus hidden status. The action opens the existing menu editor.
- Date filters affect traffic only; current review/update state is clearly labeled. The client refreshes on focus, tab return and every 60 seconds while visible, clears report data on errors, and aborts superseded requests.

## Authorization and consistency

A signed Google session is necessary but insufficient. Every request joins the stored user and active owner/manager grant for the requested business place. An Admin-only cookie has no bypass. A hidden place is still readable by its active manager for management purposes, with a visible notice; editing remains governed by the existing editing rules.

Queries run in one repeatable-read transaction after shared locks on the place, grant and Google-linked user. Existing suspension/revocation locks the place first; unlinking updates the locked user. Static SQL constants are executed with bound parameters only. Aggregate rows do not include viewer identity/session hashes or another contributor's private data.

## Verification

- Lint: no errors; two existing warnings outside this change.
- 102 unit tests passed and production build passed.
- HTTP smoke: missing login, Admin-only cookie, tampered Google session, malformed place ID, invalid dates, private/no-store and Vary Cookie.
- `node --experimental-strip-types scripts/test-owner-dashboard-sql.ts` prints a rollback-only SQL regression. Executed on isolated Neon branch `test-dashboard-20261104`, using the exact query constants from the endpoint. Two-place/two-manager fixtures verify isolation, scoped metrics and ratings, private review exclusion, own-update filtering, suspended/revoked/unlinked account denial. Fixtures roll back.
- Full authenticated HTTP-to-Neon and real-device UI acceptance remain unverified in this executor because direct PostgreSQL connectivity is unavailable. No production data was changed by this step.
