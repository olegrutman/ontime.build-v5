-- Fix Security Definer Views - Convert to Security Invoker
-- This ensures views respect the querying user's RLS policies

-- Drop and recreate views with SECURITY INVOKER

DROP VIEW IF EXISTS public.tm_labor_entries_fs;
DROP VIEW IF EXISTS public.tm_periods_gc;
DROP VIEW IF EXISTS public.tm_material_entries_fs;

-- View for FS: Labor entries without hourly_rate (SECURITY INVOKER)
CREATE VIEW public.tm_labor_entries_fs
WITH (security_invoker = true)
AS
SELECT 
  id, period_id, entry_date, hours, description, entered_by, created_at, updated_at
FROM public.tm_labor_entries;

-- View for GC: Period summary only (no individual entries, just totals) (SECURITY INVOKER)
CREATE VIEW public.tm_periods_gc
WITH (security_invoker = true)
AS
SELECT 
  id, work_item_id, period_start, period_end, period_type, status,
  submitted_at, approved_at, rejection_notes,
  final_amount,
  created_at, updated_at
FROM public.tm_periods
WHERE status IN ('SUBMITTED', 'APPROVED');

-- View for FS: Material entries without unit_cost (SECURITY INVOKER)
CREATE VIEW public.tm_material_entries_fs
WITH (security_invoker = true)
AS
SELECT 
  id, period_id, entry_date, description, quantity, uom, supplier_id, notes, created_at, updated_at
FROM public.tm_material_entries;