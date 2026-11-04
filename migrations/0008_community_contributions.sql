-- 11Local community contributions step 1. Additive, re-runnable; preserve all existing IDs and content.
ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS tracking_token_hash text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contributions_tracking_token_idx
  ON public.contributions (tracking_token_hash) WHERE tracking_token_hash IS NOT NULL;

-- Community image bytes must never be inserted into public.place_photos before Admin approval.
CREATE TABLE IF NOT EXISTS public.contribution_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  sort_order smallint NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 3),
  is_cover boolean NOT NULL DEFAULT false,
  mime_type text NOT NULL CHECK (mime_type = 'image/webp'),
  contents bytea NOT NULL CHECK (octet_length(contents) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contribution_photos_contribution_idx
  ON public.contribution_photos (contribution_id, sort_order);

-- Anonymous submission limit: one hashed IP fingerprint per sliding 24-hour window.
CREATE TABLE IF NOT EXISTS public.contribution_rate_limits (
  fingerprint text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

REVOKE ALL ON public.contribution_photos, public.contribution_rate_limits
  FROM PUBLIC, anonymous, local_public_reader;
REVOKE ALL ON public.contributions FROM PUBLIC, anonymous, local_public_reader;
