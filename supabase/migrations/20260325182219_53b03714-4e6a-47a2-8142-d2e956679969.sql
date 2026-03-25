
ALTER TABLE public.project_profiles
  ADD COLUMN IF NOT EXISTS scope_backout_blocking boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope_backout_blocking_items text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope_backout_shimming boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope_backout_stud_repair boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope_backout_nailer_plates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope_backout_pickup_framing boolean NOT NULL DEFAULT true;

ALTER TABLE public.project_profiles DROP COLUMN IF EXISTS scope_interior_blocking;
