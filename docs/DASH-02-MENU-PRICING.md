# DASH-02: Menu and price lists

Step 2 adds menu / price management for Admin and verified active place managers. Owner statistics remain step 3.

## Routes

- `/admin/menu`: place list with menu publication and revision status, pending first.
- `/admin/menu/[id]`: Admin editor, preview, revision history, moderation and hide/restore.
- `/quan-ly-menu/[id]`: owner editor, reached from the existing place management page.
- Public place detail is rendered on the server; the map detail panel fetches the same moderated menu API.
- Dashboard includes published menu, pending revisions and 90-day update counters.

## Content and moderation

Menus can contain original menu images, ordered groups and ordered items. Group types cover food/drinks, services, tickets, rooms and reference prices. Items support fixed/from/range/free/contact prices, VND integer amounts, units, description, optional image, availability and inclusive validity dates in Vietnam time. Non-current items are omitted publicly; an empty current menu is omitted. Temporarily unavailable items retain an explicit label.

The canonical public snapshot lives in `place_menus`. `menu_revisions` keeps draft/pending/needs-info/approved/rejected versions. Drafts and pending edits never replace the public snapshot. One open revision per place, independent public/revision version checks and a place-first lock order serialize edits and approvals. Admin can request more information or reject abandoned drafts. Admin cannot edit an owner's draft; the original author responds and resubmits. Approval rechecks active Google-linked management permission, editable place state, version and image moderation.

Image bytes reuse existing moderated place photo storage. Admin uploads appear in the editor immediately. Owners upload photos into the existing review queue, then select them after Admin approves. The menu does not delete photos or give owners new rights over community photos. Published menus recheck image status on every read and use `api.public_places` for place/category visibility. Existing report/edit/photo contribution actions remain available on place detail.

Limits: 20 groups, 200 items, 10 original-menu photos, 200 KB JSON request body. Every draft change, submission, moderation decision and visibility change has an audit log. No new environment variables.

## Database and verification

Apply `migrations/0015_menu_pricing.sql` after 0013. It only adds two tables and indexes; all existing IDs and data are preserved. Migration applied to the existing 11Local main database on 2026-11-04; tested twice on the isolated Neon branch `test-dashboard-20261104`; `scripts/test-menu-pricing.sql` checks public snapshot isolation, one open revision, stale writes, hiding and restricted draft access with rolled-back fixtures.

Validation: lint (two pre-existing warnings), 97 unit tests, production build, seven local HTTP authorization/origin checks, migration regression and Dashboard SQL on the test branch. Full authenticated HTTP-to-Neon and real-device UI acceptance have not been verified in this environment because direct PostgreSQL connectivity is unavailable.
