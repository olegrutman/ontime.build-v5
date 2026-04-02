
-- project_types write policies
CREATE POLICY "Platform staff can insert project_types" ON public.project_types
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update project_types" ON public.project_types
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete project_types" ON public.project_types
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));

-- scope_sections write policies
CREATE POLICY "Platform staff can insert scope_sections" ON public.scope_sections
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update scope_sections" ON public.scope_sections
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete scope_sections" ON public.scope_sections
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));

-- scope_items write policies
CREATE POLICY "Platform staff can insert scope_items" ON public.scope_items
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update scope_items" ON public.scope_items
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete scope_items" ON public.scope_items
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));

-- contract_scope_categories write policies
CREATE POLICY "Platform staff can insert contract_scope_categories" ON public.contract_scope_categories
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update contract_scope_categories" ON public.contract_scope_categories
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete contract_scope_categories" ON public.contract_scope_categories
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));

-- trades write policies
CREATE POLICY "Platform staff can insert trades" ON public.trades
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update trades" ON public.trades
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete trades" ON public.trades
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));

-- sov_templates write policies
CREATE POLICY "Platform staff can insert sov_templates" ON public.sov_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can update sov_templates" ON public.sov_templates
  FOR UPDATE TO authenticated USING (public.is_platform_staff(auth.uid()));
CREATE POLICY "Platform staff can delete sov_templates" ON public.sov_templates
  FOR DELETE TO authenticated USING (public.is_platform_staff(auth.uid()));
