CREATE TABLE public.crew_project_budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 labor numeric(14,2) NOT NULL DEFAULT 0 CHECK (labor >= 0),
 materials numeric(14,2) NOT NULL DEFAULT 0 CHECK (materials >= 0),
 tools_equipment numeric(14,2) NOT NULL DEFAULT 0 CHECK (tools_equipment >= 0),
 other numeric(14,2) NOT NULL DEFAULT 0 CHECK (other >= 0),
 UNIQUE(project_id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_project_budgets TO authenticated;
GRANT ALL ON public.crew_project_budgets TO service_role;
ALTER TABLE public.crew_project_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Crew members manage private project budgets" ON public.crew_project_budgets FOR ALL TO authenticated
 USING (public.user_in_org(auth.uid(), organization_id) AND public.can_see_project(project_id) AND EXISTS (SELECT 1 FROM public.project_participants p JOIN public.organizations o ON o.id=p.organization_id WHERE p.project_id=crew_project_budgets.project_id AND p.organization_id=crew_project_budgets.organization_id AND p.invite_status='ACCEPTED' AND o.type='FC'))
 WITH CHECK (public.user_in_org(auth.uid(), organization_id) AND public.can_see_project(project_id) AND EXISTS (SELECT 1 FROM public.project_participants p JOIN public.organizations o ON o.id=p.organization_id WHERE p.project_id=crew_project_budgets.project_id AND p.organization_id=crew_project_budgets.organization_id AND p.invite_status='ACCEPTED' AND o.type='FC'));