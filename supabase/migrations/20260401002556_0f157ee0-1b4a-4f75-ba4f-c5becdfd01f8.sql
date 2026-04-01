CREATE POLICY "Contract members can update project SOV"
ON public.project_sov
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_contracts pc
    JOIN user_org_roles uor ON (uor.organization_id = pc.from_org_id OR uor.organization_id = pc.to_org_id)
    WHERE pc.id = project_sov.contract_id
    AND uor.user_id = auth.uid()
  )
  OR (
    contract_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = project_sov.project_id
      AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_contracts pc
    JOIN user_org_roles uor ON (uor.organization_id = pc.from_org_id OR uor.organization_id = pc.to_org_id)
    WHERE pc.id = project_sov.contract_id
    AND uor.user_id = auth.uid()
  )
  OR (
    contract_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = project_sov.project_id
      AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
    )
  )
);