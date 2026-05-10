CREATE POLICY "Platform staff can update change orders"
ON public.change_orders FOR UPDATE
USING (public.is_platform_staff(auth.uid()))
WITH CHECK (public.is_platform_staff(auth.uid()));