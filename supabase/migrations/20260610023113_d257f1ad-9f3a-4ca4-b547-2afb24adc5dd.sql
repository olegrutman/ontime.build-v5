
ALTER TABLE public.project_team ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.project_schedule_items ALTER COLUMN created_by DROP NOT NULL;
