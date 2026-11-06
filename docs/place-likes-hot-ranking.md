# 11Local — Likes & Public Hot Ranking V1

- Only Google-authenticated accounts can like a **published** place.
- One active like per `(place_id,user_id)` is enforced by the database primary key.
- Clicking again removes the like; two simultaneous PUTs cannot double count.
- Only aggregate like counts are public. Raw user identifiers are server-only.
- PUT/DELETE are idempotent, no social video or review is changed.
- The public catalog shows all approved places before assigning the Hot rank;
  hidden/unapproved places or categories are excluded.
- All displayed scores and component points are derived from actual data.
- Ratings count approved, non-deleted reviews. The current view count tracks
  real visits; views_30d uses the last 30 calendar days in Vietnam.
- For rating count n > 0, adjusted stars = (avg*n + 3.5*5) / (n+5).
  Rating points = adjusted stars / 5 * 40. If n=0, rating points=0.
- Like points = 35*min(1,log(1+likes)/log(201)).
- View points = 25*min(1,log(1+views_30d)/log(3001)).
- Every component is rounded to one decimal; total is their rounded sum.
  No rating, likes or recent views => place has no Hot rank.
- Ties: likes DESC, approved reviews DESC, views_30d DESC, Vietnamese name,
  ID. Editor featured_rank/featured_until only affect the separate curated list.

## Release checklist

1. Run `migrations/0020_place_likes_hot_ranking.sql` on **11Local Neon only**
   before deploying the application; retain the existing tables.
2. Run `npm run check` (lint, tests, build) and confirm CI.
3. Verify anonymous GET shows only aggregates; PUT/DELETE without Google
   identity return 401, unpublished places return 404.
4. Try two concurrent likes from the same account; only one active row.
   Unlike and unlike again must both leave zero; same account may like again.
5. Confirm homepage/map/detail/share page render actual counts and visible
   breakdown; compare top positions to database records.
6. Confirm site-wide traffic counter did not change, and no Admin
   `featured_rank` value influences Hot ranking.

The migration is a manual DB deployment step and is **not run by the GitHub merge**.
