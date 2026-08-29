ALTER TABLE public.co_labor_entries
  ADD COLUMN IF NOT EXISTS crew_size numeric,
  ADD COLUMN IF NOT EXISTS days numeric,
  ADD COLUMN IF NOT EXISTS hours_per_day numeric;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.co_labor_entries TO authenticated;
GRANT ALL ON public.co_labor_entries TO service_role;