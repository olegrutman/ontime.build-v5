ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS owner_approver_email text,
  ADD COLUMN IF NOT EXISTS architect_approver_email text;