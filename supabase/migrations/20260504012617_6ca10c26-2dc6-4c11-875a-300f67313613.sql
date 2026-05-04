
-- Add retainage settings to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS retainage_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retainage_release_trigger text NOT NULL DEFAULT 'substantial_completion';

-- Add check constraint for release trigger
ALTER TABLE public.projects
  ADD CONSTRAINT chk_retainage_release_trigger
  CHECK (retainage_release_trigger IN ('substantial_completion', 'final_completion', 'project_close'));

-- Add retainage snapshot columns to change_orders
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS retainage_amount numeric,
  ADD COLUMN IF NOT EXISTS retainage_released boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retainage_released_at timestamptz;
