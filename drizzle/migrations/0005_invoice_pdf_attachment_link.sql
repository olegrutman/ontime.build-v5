ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_pdf_url text,
  ADD COLUMN IF NOT EXISTS invoice_pdf_generated_at timestamptz;