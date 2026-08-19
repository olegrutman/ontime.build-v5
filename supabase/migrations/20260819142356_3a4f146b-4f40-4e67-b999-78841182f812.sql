ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS gc_owner_markup_percent numeric,
  ADD COLUMN IF NOT EXISTS passed_to_owner boolean,
  ADD COLUMN IF NOT EXISTS not_passed_reason text;

UPDATE public.change_orders
SET passed_to_owner = true
WHERE passed_to_owner IS NULL AND COALESCE(gc_budget, 0) > 0;