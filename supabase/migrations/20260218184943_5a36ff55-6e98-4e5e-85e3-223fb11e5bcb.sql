DROP POLICY IF EXISTS "Assigned or submitting org can update RFIs" ON project_rfis;

CREATE POLICY "Project team members can update RFIs"
  ON project_rfis
  FOR UPDATE
  USING (has_project_access(auth.uid(), project_id));