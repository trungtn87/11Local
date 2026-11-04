-- DASH-02: versioned menu / price lists. Additive and re-runnable.
BEGIN;
CREATE TABLE IF NOT EXISTS public.place_menus (
  place_id uuid PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  content jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version>=1),
  hidden boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (content IS NULL OR jsonb_typeof(content)='object')
);
CREATE TABLE IF NOT EXISTS public.menu_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.place_menus(place_id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('admin','owner')),
  base_version integer NOT NULL CHECK (base_version>=1),
  version integer NOT NULL DEFAULT 1 CHECK (version>=1),
  content jsonb NOT NULL CHECK (jsonb_typeof(content)='object'),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','needs_info','approved','rejected')),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS menu_revisions_one_open
  ON public.menu_revisions(place_id) WHERE status IN ('draft','pending','needs_info');
CREATE INDEX IF NOT EXISTS menu_revisions_queue ON public.menu_revisions(status,submitted_at DESC);
CREATE INDEX IF NOT EXISTS menu_revisions_history ON public.menu_revisions(place_id,created_at DESC);
REVOKE ALL ON public.place_menus,public.menu_revisions FROM PUBLIC,anonymous,local_public_reader;
COMMIT;
