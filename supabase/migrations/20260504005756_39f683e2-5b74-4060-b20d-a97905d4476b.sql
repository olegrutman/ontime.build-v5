
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_reason text;
