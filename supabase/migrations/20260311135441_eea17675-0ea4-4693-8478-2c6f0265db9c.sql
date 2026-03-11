
-- Fix SELECT policy: replace profiles.id with profiles.user_id
DROP POLICY IF EXISTS "Users can view invites" ON public.project_invites;
CREATE POLICY "Users can view invites" ON public.project_invites
  FOR SELECT TO authenticated
  USING (
    invited_email IN (SELECT email FROM public.profiles WHERE user_id = auth.uid())
    OR invited_by_user_id = auth.uid()
  );

-- Fix UPDATE policy: replace profiles.id with profiles.user_id
DROP POLICY IF EXISTS "Users can update invites they received" ON public.project_invites;
CREATE POLICY "Users can update invites they received" ON public.project_invites
  FOR UPDATE TO authenticated
  USING (
    invited_email IN (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  );
