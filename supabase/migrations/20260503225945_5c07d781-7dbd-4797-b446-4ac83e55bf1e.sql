ALTER TABLE public.projects
  ADD COLUMN role_label_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
