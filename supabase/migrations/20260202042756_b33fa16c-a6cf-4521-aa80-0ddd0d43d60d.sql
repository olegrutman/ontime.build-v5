-- Allow users to view suppliers that are on project teams they have access to
CREATE POLICY "Users can view suppliers on shared project teams"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM project_team pt
      WHERE pt.org_id = suppliers.organization_id
        AND (
          user_is_project_participant(auth.uid(), pt.project_id)
          OR pt.project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
        )
    )
  );