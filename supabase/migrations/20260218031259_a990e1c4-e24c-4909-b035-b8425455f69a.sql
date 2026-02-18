
-- Allow project creators and invite senders to delete invites
CREATE POLICY "Project creators can delete invites"
  ON public.project_invites FOR DELETE
  USING (
    invited_by_user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Allow project creators and org participants to delete team members
CREATE POLICY "Project creators can delete team members"
  ON public.project_team FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
    OR project_id IN (
      SELECT project_id FROM project_participants
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow project creators to delete associated contracts when removing team members
CREATE POLICY "Project creators can delete contracts"
  ON public.project_contracts FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );
