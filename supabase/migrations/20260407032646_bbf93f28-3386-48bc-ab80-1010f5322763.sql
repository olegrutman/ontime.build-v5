ALTER TABLE public.estimate_pdf_uploads
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN parsed_result jsonb,
  ADD COLUMN error_message text,
  ADD COLUMN completed_at timestamptz;