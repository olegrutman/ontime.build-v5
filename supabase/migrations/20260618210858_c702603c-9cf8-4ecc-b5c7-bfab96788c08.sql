
-- Step 4: Per-CO rollup view (companion to existing co_sov_contract_rollup)
CREATE OR REPLACE VIEW public.co_sov_per_co_view AS
SELECT
  l.project_id,
  l.contract_id,
  l.source_co_id,
  COUNT(*) AS line_count,
  COALESCE(SUM(l.scheduled_value), 0) AS total_scheduled_value,
  COALESCE(SUM(l.billed_to_date), 0) AS total_billed_to_date,
  COALESCE(SUM(l.scheduled_value - l.billed_to_date), 0) AS total_remaining
FROM public.co_sov_lines l
GROUP BY l.project_id, l.contract_id, l.source_co_id;

GRANT SELECT ON public.co_sov_per_co_view TO authenticated;

-- Step 6: Cutover — enable co_v4 for every organization without an explicit row.
INSERT INTO public.co_v4_feature_flags (org_id, flag, enabled)
SELECT o.id, 'co_v4', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.co_v4_feature_flags f
  WHERE f.org_id = o.id AND f.flag = 'co_v4'
);
