-- Add per-line-item pricing_type override (null = inherit from CO)
ALTER TABLE public.co_line_items
  ADD COLUMN pricing_type text,
  ADD COLUMN nte_cap numeric;

-- Constrain pricing_type to valid values when set
ALTER TABLE public.co_line_items
  ADD CONSTRAINT co_line_items_pricing_type_check
  CHECK (pricing_type IS NULL OR pricing_type IN ('fixed', 'tm', 'nte'));

-- nte_cap must be positive when set
ALTER TABLE public.co_line_items
  ADD CONSTRAINT co_line_items_nte_cap_check
  CHECK (nte_cap IS NULL OR nte_cap > 0);
