-- Nhà của Gấu: completely new memory model; keep existing Google-auth users.
CREATE TABLE IF NOT EXISTS family_albums(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 description text NOT NULL DEFAULT '',
 event_date date,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_places(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 visited_on date,
 album_id uuid REFERENCES family_albums(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_milestones(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 150),
 details text NOT NULL DEFAULT '',
 event_date date NOT NULL,
 album_id uuid REFERENCES family_albums(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS family_photos(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 album_id uuid NOT NULL REFERENCES family_albums(id) ON DELETE CASCADE,
 uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 content bytea NOT NULL,
 caption text NOT NULL DEFAULT '',
 mime text NOT NULL DEFAULT 'image/webp',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 width integer NOT NULL CHECK(width>0),
 height integer NOT NULL CHECK(height>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS family_photos_album_status_idx ON family_photos(album_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS family_photos_uploader_idx ON family_photos(uploaded_by,created_at DESC);
