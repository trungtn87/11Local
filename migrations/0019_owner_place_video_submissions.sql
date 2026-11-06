-- 11Local: owner-added video links follow the existing reviewed-content workflow.
-- Additive to 0018. Previously linked Admin videos remain approved and visible.
ALTER TABLE public.place_video_reviews
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.place_video_reviews'::regclass
    AND conname='place_video_reviews_source_check') THEN
    ALTER TABLE public.place_video_reviews ADD CONSTRAINT place_video_reviews_source_check
      CHECK (source IN ('admin','owner'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.place_video_reviews'::regclass
    AND conname='place_video_reviews_moderation_check') THEN
    ALTER TABLE public.place_video_reviews ADD CONSTRAINT place_video_reviews_moderation_check
      CHECK (moderation_status IN ('pending','approved','rejected'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS place_video_reviews_owner_idx
  ON public.place_video_reviews (place_id, submitted_by_user_id, created_at DESC)
  WHERE source='owner';
CREATE INDEX IF NOT EXISTS place_video_reviews_pending_idx
  ON public.place_video_reviews (created_at DESC)
  WHERE moderation_status='pending';
