DROP POLICY IF EXISTS "Contract creators can update contracts" ON project_contracts;

CREATE POLICY "Contract party members can update contracts"
ON project_contracts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_org_roles.user_id = auth.uid()
    AND (
      user_org_roles.organization_id = project_contracts.from_org_id
      OR user_org_roles.organization_id = project_contracts.to_org_id
    )
  )
);