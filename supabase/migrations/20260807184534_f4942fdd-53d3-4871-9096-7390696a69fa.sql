-- gc_owner_billings: fix swapped is_project_participant(user, project) args
DROP POLICY IF EXISTS "GC members can view their owner billings" ON public.gc_owner_billings;
DROP POLICY IF EXISTS "GC members can insert their owner billings" ON public.gc_owner_billings;
DROP POLICY IF EXISTS "GC members can update their owner billings" ON public.gc_owner_billings;
DROP POLICY IF EXISTS "GC members can delete their owner billings" ON public.gc_owner_billings;

CREATE POLICY "GC members can view their owner billings"
ON public.gc_owner_billings FOR SELECT TO authenticated
USING (
  public.is_project_participant(auth.uid(), project_id)
  AND public.user_is_gc_in_org(auth.uid(), gc_org_id)
  AND public.can_see_project(project_id)
);

CREATE POLICY "GC members can insert their owner billings"
ON public.gc_owner_billings FOR INSERT TO authenticated
WITH CHECK (
  public.is_project_participant(auth.uid(), project_id)
  AND public.user_is_gc_in_org(auth.uid(), gc_org_id)
  AND public.can_see_project(project_id)
);

CREATE POLICY "GC members can update their owner billings"
ON public.gc_owner_billings FOR UPDATE TO authenticated
USING (
  public.is_project_participant(auth.uid(), project_id)
  AND public.user_is_gc_in_org(auth.uid(), gc_org_id)
  AND public.can_see_project(project_id)
)
WITH CHECK (
  public.is_project_participant(auth.uid(), project_id)
  AND public.user_is_gc_in_org(auth.uid(), gc_org_id)
  AND public.can_see_project(project_id)
);

CREATE POLICY "GC members can delete their owner billings"
ON public.gc_owner_billings FOR DELETE TO authenticated
USING (
  public.is_project_participant(auth.uid(), project_id)
  AND public.user_is_gc_in_org(auth.uid(), gc_org_id)
  AND public.can_see_project(project_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gc_owner_billings TO authenticated;
GRANT ALL ON public.gc_owner_billings TO service_role;

-- co_ai_intakes: same swapped-arg bug
DROP POLICY IF EXISTS "Project participants can read linked intakes" ON public.co_ai_intakes;
CREATE POLICY "Project participants can read linked intakes"
ON public.co_ai_intakes FOR SELECT TO authenticated
USING (
  finalized_co_id IS NOT NULL
  AND public.is_project_participant(auth.uid(), project_id)
  AND public.can_see_project(project_id)
);

-- co_sov_lines: same swapped-arg bug
DROP POLICY IF EXISTS "Participants read CO SOV lines" ON public.co_sov_lines;
CREATE POLICY "Participants read CO SOV lines"
ON public.co_sov_lines FOR SELECT TO authenticated
USING (
  public.is_project_participant(auth.uid(), project_id)
  AND public.can_see_project(project_id)
);