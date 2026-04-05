
-- 1. Create setup_questions table
CREATE TABLE public.setup_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase integer NOT NULL,
  phase_name text NOT NULL,
  section text NOT NULL,
  sort_order integer NOT NULL,
  label text NOT NULL,
  field_key text NOT NULL UNIQUE,
  input_type text NOT NULL,
  trigger_condition text,
  options_by_type jsonb NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.setup_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read setup questions"
  ON public.setup_questions FOR SELECT TO authenticated
  USING (true);

-- 2. Create project_setup_answers table
CREATE TABLE public.project_setup_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, field_key)
);

ALTER TABLE public.project_setup_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project participants can read answers"
  ON public.project_setup_answers FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT pp.project_id FROM project_participants pp
      WHERE pp.organization_id IN (
        SELECT uor.organization_id FROM user_org_roles uor WHERE uor.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project participants can insert answers"
  ON public.project_setup_answers FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT pp.project_id FROM project_participants pp
      WHERE pp.organization_id IN (
        SELECT uor.organization_id FROM user_org_roles uor WHERE uor.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project participants can update answers"
  ON public.project_setup_answers FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT pp.project_id FROM project_participants pp
      WHERE pp.organization_id IN (
        SELECT uor.organization_id FROM user_org_roles uor WHERE uor.user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_setup_answers_project ON public.project_setup_answers(project_id);
CREATE INDEX idx_setup_questions_phase ON public.setup_questions(phase, sort_order);
