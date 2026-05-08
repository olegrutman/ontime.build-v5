
CREATE POLICY "Platform users can view change orders" ON public.change_orders
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_line_items" ON public.co_line_items
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_labor_entries" ON public.co_labor_entries
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_activity" ON public.co_activity
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_audit_log" ON public.co_audit_log
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_material_items" ON public.co_material_items
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_equipment_items" ON public.co_equipment_items
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_photos" ON public.co_photos
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_evidence" ON public.co_evidence
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_scope_evidence" ON public.co_scope_evidence
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_nte_log" ON public.co_nte_log
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_combined_members" ON public.co_combined_members
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_external_invites" ON public.co_external_invites
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform users can view co_sov_items" ON public.co_sov_items
  FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));
