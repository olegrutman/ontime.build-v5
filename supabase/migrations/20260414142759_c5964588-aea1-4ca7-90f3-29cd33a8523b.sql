CREATE POLICY "Platform users can update SOV item names"
ON public.project_sov_items FOR UPDATE
TO authenticated
USING (public.is_platform_user(auth.uid()))
WITH CHECK (public.is_platform_user(auth.uid()));