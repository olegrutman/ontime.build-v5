CREATE POLICY "GC can view TC labor"
  ON change_order_tc_labor
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM change_order_projects cop
      JOIN project_team pt ON pt.project_id = cop.project_id
      JOIN user_org_roles uor ON uor.organization_id = pt.org_id
      WHERE cop.id = change_order_tc_labor.change_order_id
        AND uor.user_id = auth.uid()
        AND pt.role = 'General Contractor'
        AND pt.status = 'Accepted'
    )
  );