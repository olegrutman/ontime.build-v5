
CREATE TABLE public.project_scope_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  scope_item_id uuid REFERENCES public.scope_items(id) NOT NULL,
  assigned_to_org_id uuid REFERENCES public.organizations(id) NOT NULL,
  assigned_role text NOT NULL CHECK (assigned_role IN ('Trade Contractor', 'Field Crew')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, scope_item_id)
);

ALTER TABLE public.project_scope_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view scope assignments"
ON public.project_scope_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = project_scope_assignments.project_id
    AND pt.user_id = auth.uid()
    AND pt.status = 'Accepted'
  )
);

CREATE POLICY "Team members can manage scope assignments"
ON public.project_scope_assignments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = project_scope_assignments.project_id
    AND pt.user_id = auth.uid()
    AND pt.status = 'Accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_team pt
    WHERE pt.project_id = project_scope_assignments.project_id
    AND pt.user_id = auth.uid()
    AND pt.status = 'Accepted'
  )
);
