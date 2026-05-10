CREATE POLICY "Platform staff can view all member permissions"
ON public.member_permissions FOR SELECT
USING (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can update all member permissions"
ON public.member_permissions FOR UPDATE
USING (public.is_platform_staff(auth.uid()))
WITH CHECK (public.is_platform_staff(auth.uid()));

CREATE POLICY "Platform staff can insert member permissions"
ON public.member_permissions FOR INSERT
WITH CHECK (public.is_platform_staff(auth.uid()));