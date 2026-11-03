-- 11Local MAP-02: Store small optimized images in Neon PostgreSQL.
-- Image blobs are NOT exposed by the Neon public Data API.
-- Intended for thumbnails / optimized WebP only: max 300 KiB each.
CREATE TABLE IF NOT EXISTS place_image_blobs (
  photo_id uuid PRIMARY KEY REFERENCES place_photos(id) ON DELETE CASCADE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/avif')),
  contents bytea NOT NULL CHECK (octet_length(contents) BETWEEN 1 AND 307200),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The public Data API serves only this allowlisted view. No raw tables are exposed.
CREATE SCHEMA IF NOT EXISTS api;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'local_public_reader') THEN
    CREATE ROLE local_public_reader NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous NOLOGIN;
  END IF;
END $$;

CREATE OR REPLACE VIEW api.public_places WITH (security_barrier=true) AS
SELECT p.id, p.slug, p.name, p.description, p.address, p.area,
       p.latitude, p.longitude, p.category_id, c.name AS category_name,
       p.ownership_status, p.phone
FROM public.places p
JOIN public.categories c ON c.id = p.category_id
WHERE p.moderation_status = 'approved' AND p.visibility = 'visible';

REVOKE ALL ON SCHEMA api FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anonymous;
GRANT USAGE ON SCHEMA api TO anonymous, local_public_reader;
GRANT SELECT ON api.public_places TO anonymous, local_public_reader;

-- Neon Data API (separate infrastructure setting):
-- db_schemas = ['api']; db_anon_role = 'anonymous'; add_default_grants = false.
-- Verify anonymous has no SELECT rights on public.users, public.places or image blobs.
