CREATE OR REPLACE FUNCTION public.is_invited_org_admin(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (SELECT 1 FROM project_participants pp JOIN user_org_roles r
    ON r.organization_id = pp.organization_id AND r.user_id = auth.uid() AND r.is_admin
    WHERE pp.project_id = _project_id AND pp.invite_status = 'INVITED');
$f$;
DROP POLICY IF EXISTS "Invited company admins can view invited project basics" ON public.projects;
CREATE POLICY "Invited company admins can view invited project basics" ON public.projects
FOR SELECT TO authenticated USING (public.is_invited_org_admin(id));