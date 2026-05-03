-- Add document_type column
ALTER TABLE public.change_orders
  ADD COLUMN document_type text NOT NULL DEFAULT 'CO';

-- Add check constraint
ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_document_type_check
  CHECK (document_type IN ('CO', 'WO'));

-- Backfill existing rows
UPDATE public.change_orders
  SET document_type = 'WO'
  WHERE pricing_type = 'tm';
