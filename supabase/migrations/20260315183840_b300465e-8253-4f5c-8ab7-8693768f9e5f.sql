
CREATE TABLE public.work_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.change_order_projects(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  location_data JSONB DEFAULT '{}',
  work_type TEXT,
  reason TEXT,
  structural_element TEXT,
  scope_size TEXT,
  urgency TEXT,
  pricing_mode TEXT DEFAULT 'fixed',
  requires_materials BOOLEAN DEFAULT false,
  material_cost_responsibility TEXT,
  requires_equipment BOOLEAN DEFAULT false,
  equipment_cost_responsibility TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  photo_url TEXT,
  voice_note_url TEXT,
  field_capture_id UUID REFERENCES public.field_captures(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.work_order_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: project participants can SELECT
CREATE POLICY "Project participants can view work order tasks"
ON public.work_order_tasks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_order_projects co
    JOIN public.project_team pt ON pt.project_id = co.project_id
    WHERE co.id = work_order_tasks.work_order_id
    AND pt.user_id = auth.uid()
  )
);

-- RLS: authenticated users can INSERT
CREATE POLICY "Authenticated users can insert work order tasks"
ON public.work_order_tasks FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.change_order_projects co
    JOIN public.project_team pt ON pt.project_id = co.project_id
    WHERE co.id = work_order_tasks.work_order_id
    AND pt.user_id = auth.uid()
  )
);

-- RLS: project participants can UPDATE
CREATE POLICY "Project participants can update work order tasks"
ON public.work_order_tasks FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_order_projects co
    JOIN public.project_team pt ON pt.project_id = co.project_id
    WHERE co.id = work_order_tasks.work_order_id
    AND pt.user_id = auth.uid()
  )
);

-- RLS: project participants can DELETE
CREATE POLICY "Project participants can delete work order tasks"
ON public.work_order_tasks FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_order_projects co
    JOIN public.project_team pt ON pt.project_id = co.project_id
    WHERE co.id = work_order_tasks.work_order_id
    AND pt.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_tasks;

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_work_order_task_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'complete', 'skipped') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_work_order_task_status
BEFORE INSERT OR UPDATE ON public.work_order_tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_work_order_task_status();
