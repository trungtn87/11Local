-- Additive metrics for the Discovery/Hot sections. No place/category visibility is changed.
CREATE TABLE IF NOT EXISTS public.place_metrics (
  place_id uuid PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW api.public_places WITH (security_barrier=true) AS
SELECT p.id, p.slug, p.name, p.description, p.address, p.area,
       p.latitude, p.longitude, p.category_id, c.name AS category_name,
       p.ownership_status, p.phone, p.updated_at,
       COALESCE(pm.view_count, 0) AS view_count,
       COALESCE(rv.rating_avg, 0)::double precision AS rating_avg,
       COALESCE(rv.rating_count, 0)::integer AS rating_count
FROM public.places p
JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.place_metrics pm ON pm.place_id = p.id
LEFT JOIN (
  SELECT place_id, AVG(stars) AS rating_avg, COUNT(*) AS rating_count
  FROM public.reviews
  WHERE moderation_status = 'approved'
  GROUP BY place_id
) rv ON rv.place_id = p.id
WHERE p.moderation_status = 'approved'
  AND p.visibility = 'visible'
  AND c.visibility = 'visible';

REVOKE ALL ON public.place_metrics FROM PUBLIC, anonymous, local_public_reader;
GRANT SELECT ON api.public_places TO anonymous, local_public_reader;
