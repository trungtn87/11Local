-- Per-photo title, editable description, and independent comment threads.
-- Run once on Neon before deploying the application code.
ALTER TABLE family_photos ADD COLUMN IF NOT EXISTS title varchar(150) NOT NULL DEFAULT '';
ALTER TABLE family_photos ALTER COLUMN caption TYPE text;
CREATE TABLE IF NOT EXISTS family_photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES family_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT family_photo_comments_body_nonempty CHECK (length(btrim(body)) > 0)
);
CREATE INDEX IF NOT EXISTS family_photo_comments_photo_created_idx
  ON family_photo_comments(photo_id,created_at,id);
