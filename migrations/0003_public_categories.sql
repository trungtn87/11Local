-- 11Local: category visibility + public category view.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'visible'
  CHECK (visibility IN ('visible','hidden'));

UPDATE public.categories
SET visibility = CASE
  WHEN id IN ('shop','service') THEN 'hidden'
  ELSE 'visible'
END
WHERE id IN ('food','cafe','stay','sight','shop','service');

CREATE OR REPLACE VIEW api.public_categories WITH (security_barrier=true) AS
SELECT id, name, icon, sort_order
FROM public.categories
WHERE visibility = 'visible'
ORDER BY sort_order, name;

GRANT SELECT ON api.public_categories TO anonymous, local_public_reader;
