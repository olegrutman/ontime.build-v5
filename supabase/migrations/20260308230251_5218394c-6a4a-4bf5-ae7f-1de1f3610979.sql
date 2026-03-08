
CREATE TABLE public.project_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'task',
  start_date DATE NOT NULL,
  end_date DATE,
  progress INTEGER DEFAULT 0,
  dependency_ids UUID[] DEFAULT '{}',
  work_order_id UUID REFERENCES public.change_order_projects(id) ON DELETE SET NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view schedule"
  ON public.project_schedule_items FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert schedule"
  ON public.project_schedule_items FOR INSERT TO authenticated
  WITH CHECK (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));

CREATE POLICY "Team members can update schedule"
  ON public.project_schedule_items FOR UPDATE TO authenticated
  USING (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));

CREATE POLICY "Team members can delete schedule"
  ON public.project_schedule_items FOR DELETE TO authenticated
  USING (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));

CREATE INDEX idx_schedule_items_project ON public.project_schedule_items(project_id);
