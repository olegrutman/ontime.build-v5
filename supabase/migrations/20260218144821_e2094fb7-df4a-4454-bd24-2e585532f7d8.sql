ALTER TABLE public.project_participants
ADD COLUMN IF NOT EXISTS no_estimate_confirmed boolean DEFAULT false;