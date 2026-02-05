CREATE POLICY "Project team can update estimates"
  ON supplier_estimates
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_participants
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_participants
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  );