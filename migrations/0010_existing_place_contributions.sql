
-- 11Local community feedback step 3. Additive, re-runnable.
-- Existing contribution IDs, public places, photos and status transitions stay intact.
CREATE TABLE IF NOT EXISTS public.contribution_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('admin','contributor')),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contribution_messages_thread_idx
  ON public.contribution_messages (contribution_id, created_at, id);
CREATE INDEX IF NOT EXISTS contributions_existing_place_queue_idx
  ON public.contributions (moderation_status, created_at DESC)
  WHERE kind IN ('report','edit_place','photo');
REVOKE ALL ON public.contribution_messages FROM PUBLIC, anonymous, local_public_reader;
