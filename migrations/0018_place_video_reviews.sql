-- Multiple social review links per location. Additive: existing place IDs and social URLs remain unchanged.
CREATE TABLE IF NOT EXISTS public.place_video_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('tiktok','facebook','youtube')),
  source_url text NOT NULL CHECK (length(source_url) BETWEEN 12 AND 1024),
  normalized_key text NOT NULL CHECK (length(normalized_key) BETWEEN 6 AND 1100),
  title text NOT NULL DEFAULT '' CHECK (length(title) <= 180),
  creator_name text NOT NULL DEFAULT '' CHECK (length(creator_name) <= 120),
  visibility text NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible','hidden')),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, normalized_key)
);
CREATE INDEX IF NOT EXISTS place_video_reviews_public_idx
  ON public.place_video_reviews (place_id, is_featured DESC, created_at DESC)
  WHERE visibility = 'visible';
REVOKE ALL ON public.place_video_reviews FROM PUBLIC, anonymous, local_public_reader;
