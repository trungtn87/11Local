-- Gia đình Gấu: curated map places and many-to-many family memories.
-- Run on Neon direct BEFORE deploying the matching application code.
-- Additive only: no legacy family places, albums or photos are deleted.
BEGIN;
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'memory';
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS visibility boolean NOT NULL DEFAULT true;
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS archived_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='family_places_category_valid') THEN
    ALTER TABLE family_places ADD CONSTRAINT family_places_category_valid
      CHECK (category IN ('food','travel','play','stay','landmark','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='family_places_kind_valid') THEN
    ALTER TABLE family_places ADD CONSTRAINT family_places_kind_valid
      CHECK (kind IN ('memory','curated'));
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS family_place_albums (
  place_id uuid NOT NULL REFERENCES family_places(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES family_albums(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id,album_id)
);
-- Backfill existing one-to-one links and photo-based links without data loss.
INSERT INTO family_place_albums(place_id,album_id)
  SELECT id,album_id FROM family_places WHERE album_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO family_place_albums(place_id,album_id)
  SELECT DISTINCT place_id,album_id FROM family_photos
  WHERE place_id IS NOT NULL AND status='approved'
  ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS family_places_visible_idx ON family_places (kind,category,created_at DESC)
  WHERE visibility=true AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS family_place_albums_album_idx ON family_place_albums(album_id);
COMMIT;
