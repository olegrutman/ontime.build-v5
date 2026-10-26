ALTER TABLE public.invoice_line_items ADD COLUMN IF NOT EXISTS source_entry_id uuid, ADD COLUMN IF NOT EXISTS source_entry_type text;
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_source_co ON public.invoice_line_items(source_co_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_source_entry ON public.invoice_line_items(source_entry_id);
COMMENT ON COLUMN public.invoice_line_items.source_entry_id IS 'Labor/material/equipment entry billed on this line (WO progress billing); released when the invoice is deleted.';