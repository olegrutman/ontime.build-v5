
-- Add base cost + markup columns to co_labor_entries so we can distinguish
-- internal (TC) cost from billable (GC-facing) amount.
ALTER TABLE public.co_labor_entries
  ADD COLUMN IF NOT EXISTS base_hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS base_lump_sum numeric,
  ADD COLUMN IF NOT EXISTS markup_percent numeric NOT NULL DEFAULT 0;

-- Backfill: rows that were stored pre-fix used `hourly_rate`/`lump_sum` as the
-- post-markup billable. Treat existing values as base with 0% markup so totals
-- don't shift retroactively.
UPDATE public.co_labor_entries
SET base_hourly_rate = COALESCE(base_hourly_rate, hourly_rate),
    base_lump_sum    = COALESCE(base_lump_sum, lump_sum)
WHERE base_hourly_rate IS NULL AND base_lump_sum IS NULL;

-- Replace the role view: GC sees the BILLABLE (post-markup) fields so they
-- know what they're being charged; base cost + markup are masked from GC.
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
  -- Billable hourly_rate / lump_sum / line_total: visible to everyone
  l.hourly_rate,
  l.lump_sum,
  l.line_total,
  -- Internal base rate + markup: masked from GC when entered by TC/FC
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
  l.description,
  l.is_actual_cost,
  l.actual_cost_note,
  l.created_at,
  l.gc_approved,
  l.gc_approved_at
FROM public.co_labor_entries l;

GRANT SELECT ON public.co_labor_entries_role_view TO authenticated;
