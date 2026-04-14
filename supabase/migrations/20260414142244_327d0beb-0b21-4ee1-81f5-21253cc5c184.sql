CREATE POLICY "Platform users can view all project SOV"
ON public.project_sov FOR SELECT
TO authenticated
USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view all project SOV items"
ON public.project_sov_items FOR SELECT
TO authenticated
USING (public.is_platform_user(auth.uid()));