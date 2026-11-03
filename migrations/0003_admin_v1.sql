-- 11Local Admin V1 hardening. Apply only to the existing dedicated 11Local Neon database.
-- No public write privileges are granted by this migration.
CREATE INDEX IF NOT EXISTS places_admin_status_updated_idx ON places (moderation_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS places_admin_name_lower_idx ON places (lower(name));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM PUBLIC, anonymous, local_public_reader;
REVOKE SELECT ON place_image_blobs, place_photos FROM PUBLIC, anonymous, local_public_reader;
GRANT SELECT ON api.public_places TO anonymous, local_public_reader;
