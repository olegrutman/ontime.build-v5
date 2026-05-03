
ALTER TABLE public.projects
ADD COLUMN require_photos_on_submit BOOLEAN NOT NULL DEFAULT false;
