-- 11Local community contribution review (step 2). Additive + idempotent.
-- Keep existing contributions, IDs, photos, places and categories intact.
ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS decision_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS contributions_admin_queue_idx
  ON public.contributions (moderation_status, created_at DESC)
  WHERE kind='new_place';
CREATE INDEX IF NOT EXISTS contributions_published_place_idx
  ON public.contributions (place_id)
  WHERE place_id IS NOT NULL;
-- No public permission changes: community proposals remain server-only.
REVOKE ALL ON public.contributions FROM PUBLIC, anonymous, local_public_reader;
