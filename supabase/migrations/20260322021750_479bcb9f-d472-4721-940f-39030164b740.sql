
DROP POLICY IF EXISTS "Project creator can manage profile" ON public.project_profiles;
DROP POLICY IF EXISTS "Project participants can view profiles" ON public.project_profiles;

CREATE POLICY "Project team can manage profile" ON public.project_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_profiles.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = project_profiles.project_id
        AND pt.user_id = auth.uid()
        AND pt.status = 'Accepted'
    )
  );
