ALTER TABLE public.invoice_line_items ADD COLUMN IF NOT EXISTS source_entry_ids uuid[];
COMMENT ON COLUMN public.invoice_line_items.source_entry_id IS 'DEPRECATED: replaced by source_entry_ids';
COMMENT ON COLUMN public.invoice_line_items.source_entry_type IS 'DEPRECATED: unused';