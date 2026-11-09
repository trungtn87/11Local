-- Soft delete albums rather than cascading deletion of precious family photos.
ALTER TABLE family_albums ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS family_albums_active_idx ON family_albums (created_at DESC) WHERE archived_at IS NULL;
