CREATE POLICY "Org admins can view join request profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM org_join_requests ojr
      JOIN user_org_roles uor ON uor.organization_id = ojr.organization_id
      WHERE ojr.user_id = profiles.user_id
        AND ojr.status = 'pending'
        AND uor.user_id = auth.uid()
    )
  );