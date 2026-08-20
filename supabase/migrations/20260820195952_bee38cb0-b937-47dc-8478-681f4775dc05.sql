ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS owner_rejection_note text,
  ADD COLUMN IF NOT EXISTS architect_rejection_note text;