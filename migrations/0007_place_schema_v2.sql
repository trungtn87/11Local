-- 11Local DB V2 / Step 1: additive schema for real-world place categories.
-- Backward-compatible with /api/places, api.public_places, Admin V1 and existing photos.
-- Run on dedicated 11Local Neon PostgreSQL 17; do not drop or rename legacy columns/tables.
-- Re-runnable; transaction recommended for deployment.

-- Core place identity, navigation and editorial control.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS place_kind text,
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS navigation_latitude double precision,
  ADD COLUMN IF NOT EXISTS navigation_longitude double precision,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_rank integer,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Only backfill NULL records once; never overwrite a previously selected kind.
UPDATE public.places
SET place_kind = CASE WHEN category_id = 'sight' THEN 'attraction' ELSE 'business' END
WHERE place_kind IS NULL;
ALTER TABLE public.places ALTER COLUMN place_kind SET DEFAULT 'business';
ALTER TABLE public.places ALTER COLUMN place_kind SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.places'::regclass AND conname='places_v2_kind_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_v2_kind_check
      CHECK (place_kind IN ('business','attraction','public_place'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.places'::regclass AND conname='places_v2_navigation_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_v2_navigation_check CHECK (
      (navigation_latitude IS NULL AND navigation_longitude IS NULL)
      OR (navigation_latitude IS NOT NULL AND navigation_longitude IS NOT NULL
        AND navigation_latitude BETWEEN -90 AND 90
        AND navigation_longitude BETWEEN -180 AND 180)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.places'::regclass AND conname='places_v2_version_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_v2_version_check CHECK (version >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.places'::regclass AND conname='places_v2_featured_rank_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_v2_featured_rank_check CHECK (featured_rank IS NULL OR featured_rank > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS places_featured_public_idx
  ON public.places (featured_rank, updated_at DESC)
  WHERE moderation_status='approved' AND visibility='visible' AND featured_rank IS NOT NULL;

-- Admin-defined typed extra fields per category. The backend must validate values
-- against these definitions before writing place_details.details.
CREATE TABLE IF NOT EXISTS public.category_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  field_key text NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  field_type text NOT NULL CHECK (field_type IN ('text','long_text','number','boolean','url','select','multi_select')),
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options)='array'),
  is_required boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, field_key)
);
CREATE INDEX IF NOT EXISTS category_fields_active_idx
  ON public.category_fields (category_id, sort_order) WHERE is_visible;

-- One typed JSON document per place, not a replacement for common columns.
CREATE TABLE IF NOT EXISTS public.place_details (
  place_id uuid PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details)='object'),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Multiple opening intervals per weekday; supports overnight hours.
-- Sunday=0, Monday=1 ... Saturday=6. A closed or 24h day uses NULL clock times.
CREATE TABLE IF NOT EXISTS public.place_opening_hours (
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_index smallint NOT NULL DEFAULT 1 CHECK (slot_index >= 1),
  opens_at time,
  closes_at time,
  is_closed boolean NOT NULL DEFAULT false,
  is_24_hours boolean NOT NULL DEFAULT false,
  PRIMARY KEY (place_id, day_of_week, slot_index),
  CONSTRAINT place_opening_hours_mode_check CHECK (
    (is_closed AND NOT is_24_hours AND opens_at IS NULL AND closes_at IS NULL)
    OR (NOT is_closed AND is_24_hours AND opens_at IS NULL AND closes_at IS NULL)
    OR (NOT is_closed AND NOT is_24_hours
       AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at <> closes_at)
  )
);

-- Price points are optional: ticket, menu item, room, service, etc.
CREATE TABLE IF NOT EXISTS public.place_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  amount_min numeric(12,2),
  amount_max numeric(12,2),
  currency text NOT NULL DEFAULT 'VND',
  unit text,
  note text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_prices_amount_check CHECK (
    (amount_min IS NULL OR amount_min >= 0)
    AND (amount_max IS NULL OR (amount_min IS NOT NULL AND amount_max >= amount_min))
  )
);
CREATE INDEX IF NOT EXISTS place_prices_active_idx
  ON public.place_prices (place_id, sort_order) WHERE is_active;

-- Searchable, reusable feature tags.
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  category_id text REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.place_tags (
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, tag_id)
);
CREATE INDEX IF NOT EXISTS place_tags_tag_idx ON public.place_tags (tag_id, place_id);

-- Never expose a pending owner/community edit through the approved places API.
CREATE TABLE IF NOT EXISTS public.place_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('admin','owner','community','import')),
  base_version integer NOT NULL CHECK (base_version >= 1),
  changes jsonb NOT NULL CHECK (jsonb_typeof(changes)='object'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','needs_info','superseded')),
  decision_note text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS place_revisions_queue_idx
  ON public.place_revisions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS place_revisions_place_idx
  ON public.place_revisions (place_id, created_at DESC);

-- Rights are granted by Admin after a separate manual ownership claim.
CREATE TABLE IF NOT EXISTS public.place_managers (
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','manager')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  ownership_claim_id uuid REFERENCES public.ownership_claims(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (place_id, user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS place_managers_one_active_owner_idx
  ON public.place_managers (place_id) WHERE role='owner' AND status='active';

-- Media metadata: keep bytes and the existing cover selection mechanism intact.
ALTER TABLE public.place_photos
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS alt_text text,
  ADD COLUMN IF NOT EXISTS credit_name text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uploaded_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS place_photos_public_sort_idx
  ON public.place_photos (place_id, photo_type, sort_order, created_at DESC)
  WHERE moderation_status='approved';

ALTER TABLE public.place_metrics
  ADD COLUMN IF NOT EXISTS save_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.place_metrics'::regclass AND conname='place_metrics_save_count_check') THEN
    ALTER TABLE public.place_metrics ADD CONSTRAINT place_metrics_save_count_check CHECK (save_count >= 0);
  END IF;
END $$;

-- Seed forms only; do not populate fictitious facts for existing places.
INSERT INTO public.category_fields (category_id,field_key,label,field_type,help_text,sort_order,options)
VALUES
 ('sight','suggested_duration_minutes','Thời gian tham quan gợi ý (phút)','number',NULL,10,'[]'),
 ('sight','best_time_to_visit','Thời điểm nên tham quan','text',NULL,20,'[]'),
 ('sight','access_notes','Lưu ý khi đến','long_text',NULL,30,'[]'),
 ('sight','parking_available','Có chỗ đỗ xe','boolean',NULL,40,'[]'),
 ('food','menu_url','Liên kết thực đơn','url',NULL,10,'[]'),
 ('food','takeaway','Có bán mang về','boolean',NULL,20,'[]'),
 ('food','reservation_available','Có nhận đặt bàn','boolean',NULL,30,'[]'),
 ('food','parking_available','Có chỗ đỗ xe','boolean',NULL,40,'[]'),
 ('cafe','wifi_available','Có wifi','boolean',NULL,10,'[]'),
 ('cafe','outdoor_seating','Có chỗ ngồi ngoài trời','boolean',NULL,20,'[]'),
 ('cafe','parking_available','Có chỗ đỗ xe','boolean',NULL,30,'[]'),
 ('stay','check_in_time','Giờ nhận phòng','text',NULL,10,'[]'),
 ('stay','check_out_time','Giờ trả phòng','text',NULL,20,'[]'),
 ('stay','amenities','Tiện nghi','multi_select',NULL,30,'["Wifi","Điều hòa","Bãi đỗ xe","Ăn sáng","Giặt là"]'),
 ('shop','delivery_available','Có giao hàng','boolean',NULL,10,'[]'),
 ('shop','payment_methods','Hình thức thanh toán','multi_select',NULL,20,'["Tiền mặt","Chuyển khoản","Thẻ"]'),
 ('service','booking_required','Cần đặt lịch trước','boolean',NULL,10,'[]'),
 ('service','service_area','Khu vực phục vụ','text',NULL,20,'[]')
ON CONFLICT (category_id,field_key) DO NOTHING;

-- New internal tables are server-only, not public API tables.
REVOKE ALL ON public.category_fields, public.place_details,
  public.place_opening_hours, public.place_prices,
  public.tags, public.place_tags, public.place_revisions,
  public.place_managers FROM PUBLIC, anonymous, local_public_reader;

-- Intentionally untouched: api.public_places, api.public_categories, place_image_blobs,
-- existing Pác Bó/Thác Bản Giốc rows, review rules, public routes and legacy columns.
