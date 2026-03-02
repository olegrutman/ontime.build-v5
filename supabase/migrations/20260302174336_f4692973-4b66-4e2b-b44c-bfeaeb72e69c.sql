
-- Add new columns to return_items
ALTER TABLE public.return_items
  ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reason_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC DEFAULT 0;
