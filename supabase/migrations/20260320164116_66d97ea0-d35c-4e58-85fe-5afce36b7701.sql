ALTER TABLE public.co_line_items ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.co_line_items ADD COLUMN IF NOT EXISTS description TEXT;