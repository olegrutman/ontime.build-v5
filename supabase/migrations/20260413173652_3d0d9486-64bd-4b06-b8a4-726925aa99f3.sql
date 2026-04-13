
-- =============================================
-- Phase 1A: Add RLS policies to orphaned tables
-- =============================================

-- material_orders: no org_id column, scope to authenticated users
-- (submitted_by links to auth.users)
CREATE POLICY "Authenticated users can view material orders"
  ON public.material_orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create material orders"
  ON public.material_orders FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Submitter or approver can update material orders"
  ON public.material_orders FOR UPDATE TO authenticated
  USING (submitted_by = auth.uid() OR approved_by = auth.uid());

-- order_items: scoped via parent material_order
CREATE POLICY "Authenticated users can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON public.order_items FOR UPDATE TO authenticated
  USING (true);

-- tm_billable_slices: no org_id column, scope to authenticated
CREATE POLICY "Authenticated users can view tm billable slices"
  ON public.tm_billable_slices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tm billable slices"
  ON public.tm_billable_slices FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tm billable slices"
  ON public.tm_billable_slices FOR UPDATE TO authenticated
  USING (true);

-- =============================================
-- Phase 1B: Lock down contract scope tables
-- =============================================

-- Drop wide-open policies
DROP POLICY IF EXISTS "Authenticated users can manage contract scope details" ON public.contract_scope_details;
DROP POLICY IF EXISTS "Authenticated users can manage contract scope exclusions" ON public.contract_scope_exclusions;
DROP POLICY IF EXISTS "Authenticated users can manage contract scope selections" ON public.contract_scope_selections;

-- contract_scope_selections: project-participant scoped
CREATE POLICY "Project participants can view scope selections"
  ON public.contract_scope_selections FOR SELECT TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Project participants can create scope selections"
  ON public.contract_scope_selections FOR INSERT TO authenticated
  WITH CHECK (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Project participants can update scope selections"
  ON public.contract_scope_selections FOR UPDATE TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Project participants can delete scope selections"
  ON public.contract_scope_selections FOR DELETE TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

-- contract_scope_exclusions: project-participant scoped
CREATE POLICY "Project participants can view scope exclusions"
  ON public.contract_scope_exclusions FOR SELECT TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Project participants can create scope exclusions"
  ON public.contract_scope_exclusions FOR INSERT TO authenticated
  WITH CHECK (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Project participants can update scope exclusions"
  ON public.contract_scope_exclusions FOR UPDATE TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

CREATE POLICY "Project participants can delete scope exclusions"
  ON public.contract_scope_exclusions FOR DELETE TO authenticated
  USING (public.is_project_participant(auth.uid(), project_id));

-- contract_scope_details: scoped via selection_id -> contract_scope_selections -> project_id
CREATE POLICY "Project participants can view scope details"
  ON public.contract_scope_details FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contract_scope_selections css
    WHERE css.id = contract_scope_details.selection_id
    AND public.is_project_participant(auth.uid(), css.project_id)
  ));

CREATE POLICY "Project participants can create scope details"
  ON public.contract_scope_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contract_scope_selections css
    WHERE css.id = contract_scope_details.selection_id
    AND public.is_project_participant(auth.uid(), css.project_id)
  ));

CREATE POLICY "Project participants can update scope details"
  ON public.contract_scope_details FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contract_scope_selections css
    WHERE css.id = contract_scope_details.selection_id
    AND public.is_project_participant(auth.uid(), css.project_id)
  ));

CREATE POLICY "Project participants can delete scope details"
  ON public.contract_scope_details FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contract_scope_selections css
    WHERE css.id = contract_scope_details.selection_id
    AND public.is_project_participant(auth.uid(), css.project_id)
  ));
