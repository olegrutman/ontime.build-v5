CREATE TABLE IF NOT EXISTS public._phase3e_policy_backup AS
SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='project_contracts';

DROP POLICY IF EXISTS "Users can view their organization's contracts" ON public.project_contracts;

CREATE POLICY "Users can view their organization's contracts"
ON public.project_contracts
FOR SELECT
TO authenticated
USING (
  (
    (EXISTS ( SELECT 1
       FROM user_org_roles uor
      WHERE ((uor.user_id = auth.uid()) AND (uor.organization_id = project_contracts.from_org_id))))
    OR (EXISTS ( SELECT 1
       FROM user_org_roles uor
      WHERE ((uor.user_id = auth.uid()) AND (uor.organization_id = project_contracts.to_org_id))))
  )
  AND can_see_project(project_id)
);