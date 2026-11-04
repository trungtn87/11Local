-- 11Local review API V1: additive, re-runnable; preserve existing IDs and approved ratings.
-- Existing api.public_places uses only reviews.moderation_status='approved' for ratings.
-- Soft deletion and hiding therefore also change moderation_status to 'rejected'.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.reviews'::regclass AND conname='reviews_version_positive') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_version_positive CHECK (version >= 1);
  END IF;
END $$;

-- Keep published reviews unchanged while a proposed edit awaits Admin approval.
CREATE TABLE IF NOT EXISTS public.review_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','superseded')),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS review_revisions_one_pending
  ON public.review_revisions(review_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS reviews_public_lookup
  ON public.reviews(place_id, created_at DESC, id DESC)
  WHERE moderation_status='approved' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS reviews_moderation_queue
  ON public.reviews(created_at DESC, id DESC)
  WHERE moderation_status='pending' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS review_revisions_queue
  ON public.review_revisions(created_at DESC, id DESC) WHERE status='pending';

-- Prevent authenticated accounts from flooding the manual review queue.
CREATE TABLE IF NOT EXISTS public.review_submission_limits (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

REVOKE ALL ON public.reviews, public.review_revisions, public.review_submission_limits
  FROM PUBLIC, anonymous, local_public_reader;
