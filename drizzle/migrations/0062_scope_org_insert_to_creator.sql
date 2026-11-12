DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations they own" ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());