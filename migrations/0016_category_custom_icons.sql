-- Custom category icons stored in Neon. Non-destructive; no existing category data is changed.
CREATE TABLE IF NOT EXISTS public.category_icon_blobs (
  id uuid PRIMARY KEY,
  contents bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
