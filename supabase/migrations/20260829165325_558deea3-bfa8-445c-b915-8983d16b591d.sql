DROP VIEW IF EXISTS public.co_labor_entries_role_view;

CREATE VIEW public.co_labor_entries_role_view
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.co_id,
  l.co_line_item_id,
  l.org_id,
  l.entered_by_role,
  l.entry_date,
  l.pricing_mode,
  l.hours,
  l.hourly_rate,
  l.lump_sum,
  l.line_total,
  CASE
    WHEN co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL::numeric
    ELSE l.base_hourly_rate
  END AS base_hourly_rate,
  CASE
    WHEN co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL::numeric
    ELSE l.base_lump_sum
  END AS base_lump_sum,
  CASE
    WHEN co_viewer_role(l.co_id) = 'gc' AND lower(l.entered_by_role) <> 'gc' THEN NULL::numeric
    ELSE l.markup_percent
  END AS markup_percent,
  l.source_fc_entry_ids,
  l.description,
  l.is_actual_cost,
  l.actual_cost_note,
  l.created_at,
  l.gc_approved,
  l.gc_approved_at,
  l.crew_size,
  l.days,
  l.hours_per_day
FROM public.co_labor_entries l;

GRANT SELECT ON public.co_labor_entries_role_view TO authenticated;