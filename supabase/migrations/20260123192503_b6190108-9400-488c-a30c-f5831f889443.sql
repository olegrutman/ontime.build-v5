-- Update project_scope_details to allow participants to insert/update
DROP POLICY IF EXISTS "Project creators can insert scope" ON project_scope_details;
DROP POLICY IF EXISTS "Project creators can update scope" ON project_scope_details;

-- Allow PM roles to insert scope for projects they're part of
CREATE POLICY "Project members can insert scope"
ON project_scope_details FOR INSERT
WITH CHECK (
  is_pm_role(auth.uid())
  AND (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
    OR user_is_project_participant(auth.uid(), project_id)
  )
);

-- Allow PM roles to update scope for projects they're part of
CREATE POLICY "Project members can update scope"
ON project_scope_details FOR UPDATE
USING (
  is_pm_role(auth.uid())
  AND (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
    OR user_is_project_participant(auth.uid(), project_id)
  )
);

-- Fix project_team view policy to avoid open access
DROP POLICY IF EXISTS "Users can view project team for their projects" ON project_team;

CREATE POLICY "Users can view project team"
ON project_team FOR SELECT
USING (
  user_is_project_participant(auth.uid(), project_id)
  OR invited_email IN (SELECT email FROM profiles WHERE user_id = auth.uid())
  OR invited_by_user_id = auth.uid()
  OR user_id = auth.uid()
  OR project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
);