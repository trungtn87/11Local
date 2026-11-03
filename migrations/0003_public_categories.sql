-- 11Local: expose approved category metadata through the public Data API.
CREATE OR REPLACE VIEW api.public_categories WITH (security_barrier=true) AS
SELECT id, name, icon, sort_order
FROM public.categories
ORDER BY sort_order, name;

GRANT SELECT ON api.public_categories TO anonymous, local_public_reader;
