CREATE POLICY "Creators can view their own projects"
ON public.projects
FOR SELECT
TO authenticated
USING (created_by = auth.uid());