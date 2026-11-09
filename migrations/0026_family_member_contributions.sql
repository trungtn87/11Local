-- Approved Google family members may create memories without manual content moderation.
-- Deploy before code. Existing admin-authored records remain valid with created_by=NULL.
ALTER TABLE family_albums ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE family_places ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE family_milestones ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE family_photos ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES family_places(id) ON DELETE SET NULL;
ALTER TABLE family_photos ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES family_milestones(id) ON DELETE SET NULL;
ALTER TABLE family_photos ADD COLUMN IF NOT EXISTS taken_on date;
CREATE INDEX IF NOT EXISTS family_photos_place_idx ON family_photos(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS family_photos_milestone_idx ON family_photos(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS family_albums_creator_idx ON family_albums(created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS family_places_creator_idx ON family_places(created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS family_milestones_creator_idx ON family_milestones(created_by,created_at DESC);

-- Idempotent metadata creation: a browser retry must not create duplicate albums/places/milestones.
CREATE TABLE IF NOT EXISTS family_contribution_batches (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 album_id uuid NOT NULL REFERENCES family_albums(id) ON DELETE CASCADE,
 place_id uuid REFERENCES family_places(id) ON DELETE SET NULL,
 milestone_id uuid REFERENCES family_milestones(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,request_id)
);
CREATE INDEX IF NOT EXISTS family_contribution_batches_created_idx ON family_contribution_batches(created_at DESC);
