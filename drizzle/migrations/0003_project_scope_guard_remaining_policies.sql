-- Append the per-member project-scope guard (can_see_project) to the remaining
-- project-scoped SELECT/ALL policies that were still org-wide only.
DO $$
DECLARE
  t record;
  q text;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('co_proposals', 'Non-crew project participants can view proposals', 'public.can_see_project(co_proposals.project_id)'),
      ('project_profiles', 'Project team can manage profile', 'public.can_see_project(project_profiles.project_id)'),
      ('project_scope_assignments', 'Team members can manage scope assignments', 'public.can_see_project(project_scope_assignments.project_id)'),
      ('project_scope_selections', 'Project creator can manage selections', 'public.can_see_project(project_scope_selections.project_id)'),
      ('supplier_estimates', 'Suppliers manage own estimates', 'public.can_see_project(supplier_estimates.project_id)'),
      ('supplier_estimate_items', 'Project team or supplier org can view estimate items',
        'EXISTS (SELECT 1 FROM public.supplier_estimates se WHERE se.id = supplier_estimate_items.estimate_id AND public.can_see_project(se.project_id))'),
      ('estimate_line_items', 'Project participants can view line items',
        'EXISTS (SELECT 1 FROM public.supplier_estimates se WHERE se.id = estimate_line_items.estimate_id AND public.can_see_project(se.project_id))'),
      ('estimate_line_items', 'Supplier org can manage own line items',
        'EXISTS (SELECT 1 FROM public.supplier_estimates se WHERE se.id = estimate_line_items.estimate_id AND public.can_see_project(se.project_id))'),
      ('estimate_pdf_uploads', 'Project participants can view uploads',
        'EXISTS (SELECT 1 FROM public.supplier_estimates se WHERE se.id = estimate_pdf_uploads.estimate_id AND public.can_see_project(se.project_id))'),
      ('estimate_pdf_uploads', 'Supplier org can manage own uploads',
        'EXISTS (SELECT 1 FROM public.supplier_estimates se WHERE se.id = estimate_pdf_uploads.estimate_id AND public.can_see_project(se.project_id))'),
      ('estimate_catalog_mapping', 'Supplier org can manage own mappings',
        'EXISTS (SELECT 1 FROM public.supplier_estimates se WHERE se.id = estimate_catalog_mapping.estimate_id AND public.can_see_project(se.project_id))')
    ) AS v(tbl, pol, guard)
  LOOP
    SELECT qual INTO q FROM pg_policies
     WHERE schemaname = 'public' AND tablename = t.tbl AND policyname = t.pol;
    IF q IS NULL THEN
      RAISE NOTICE 'skip %.% (missing)', t.tbl, t.pol;
      CONTINUE;
    END IF;
    IF q ILIKE '%can_see_project%' THEN
      RAISE NOTICE 'skip %.% (already guarded)', t.tbl, t.pol;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER POLICY %I ON public.%I USING ((%s) AND (%s))', t.pol, t.tbl, q, t.guard);
  END LOOP;
END $$;