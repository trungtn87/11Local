-- 11Local: Google-account likes and transparent, public hot-ranking inputs.
-- Run once on the dedicated 11Local Neon database before deploying the code.
-- Additive and re-runnable; never modify or reset existing reviews/views.
BEGIN;

CREATE TABLE IF NOT EXISTS public.place_likes (
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, user_id)
);
CREATE INDEX IF NOT EXISTS place_likes_by_user_idx
  ON public.place_likes(user_id, created_at DESC);
REVOKE ALL ON public.place_likes FROM PUBLIC, anonymous, local_public_reader;

-- Keep EVERY existing public_places column in the same order. Append new
-- public aggregates only. Raw user IDs and Google identities stay private.
-- Count likes directly from the unique relation: no drift-prone cache/counter.
CREATE OR REPLACE VIEW api.public_places WITH (security_barrier=true) AS
SELECT p.id, p.slug, p.name, p.description, p.address, p.area,
       p.latitude, p.longitude, p.category_id, c.name AS category_name,
       p.ownership_status, p.phone, p.updated_at,
       COALESCE(pm.view_count, 0) AS view_count,
       COALESCE(rv.rating_avg, 0)::double precision AS rating_avg,
       COALESCE(rv.rating_count, 0)::integer AS rating_count,
       COALESCE(likes.like_count, 0)::bigint AS like_count,
       COALESCE(av.views_30d, 0)::bigint AS views_30d
FROM public.places p
JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.place_metrics pm ON pm.place_id = p.id
LEFT JOIN (
  SELECT place_id, AVG(stars) AS rating_avg, COUNT(*) AS rating_count
  FROM public.reviews
  WHERE moderation_status = 'approved' AND deleted_at IS NULL
  GROUP BY place_id
) rv ON rv.place_id = p.id
LEFT JOIN (
  SELECT place_id, COUNT(*) AS like_count
  FROM public.place_likes
  GROUP BY place_id
) likes ON likes.place_id = p.id
LEFT JOIN (
  SELECT target, SUM(views)::bigint AS views_30d
  FROM public.analytics_daily
  WHERE day >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29
  GROUP BY target
) av ON av.target = p.id::text
WHERE p.moderation_status = 'approved'
  AND p.visibility = 'visible'
  AND c.visibility = 'visible';

GRANT SELECT ON api.public_places TO anonymous, local_public_reader;
COMMIT;
