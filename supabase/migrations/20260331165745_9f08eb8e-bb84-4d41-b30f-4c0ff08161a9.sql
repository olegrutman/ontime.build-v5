
CREATE TABLE public.project_framing_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  scope_complete boolean NOT NULL DEFAULT false,
  current_section integer NOT NULL DEFAULT 0,
  generated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.project_framing_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read framing scope"
  ON public.project_framing_scope FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));

CREATE POLICY "Team members can insert framing scope"
  ON public.project_framing_scope FOR INSERT TO authenticated
  WITH CHECK (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));

CREATE POLICY "Team members can update framing scope"
  ON public.project_framing_scope FOR UPDATE TO authenticated
  USING (project_id IN (
    SELECT pt.project_id FROM public.project_team pt WHERE pt.user_id = auth.uid()
  ));
