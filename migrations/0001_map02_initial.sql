-- 11Local MAP-02: Initial schema. Applied to dedicated Neon project falling-union-71877098.
-- Additive and idempotent; never run against 11Ship/AutoTrade databases.
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id text NOT NULL REFERENCES categories(id),
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  phone text,
  opening_hours text,
  price_note text,
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','rejected')),
  ownership_status text NOT NULL DEFAULT 'unverified'
    CHECK (ownership_status IN ('unverified','verified','disputed')),
  visibility text NOT NULL DEFAULT 'visible'
    CHECK (visibility IN ('visible','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS places_visible_category_idx ON places (category_id, area)
  WHERE moderation_status='approved' AND visibility='visible';
CREATE INDEX IF NOT EXISTS places_geo_idx ON places (latitude, longitude)
  WHERE moderation_status='approved' AND visibility='visible';
CREATE TABLE IF NOT EXISTS place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  source text NOT NULL CHECK (source IN ('owner','community','admin')),
  photo_type text NOT NULL DEFAULT 'gallery'
    CHECK (photo_type IN ('avatar','cover','gallery','menu')),
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('new_place','edit_place','report','photo')),
  place_id uuid REFERENCES places(id),
  payload jsonb NOT NULL,
  contact_phone text,
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','rejected','needs_info')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  phone_verified_at timestamptz,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  content text NOT NULL DEFAULT '',
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(place_id,user_id)
);
CREATE TABLE IF NOT EXISTS ownership_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id),
  user_id uuid NOT NULL REFERENCES users(id),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','disputed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO categories (id,name,icon,sort_order) VALUES
  ('food','Ăn uống','utensils',10),
  ('cafe','Cafe','coffee',20),
  ('stay','Lưu trú','bed',30),
  ('sight','Tham quan','mountain',40),
  ('shop','Mua sắm','shopping-bag',50),
  ('service','Dịch vụ','wrench',60)
ON CONFLICT (id) DO NOTHING;
