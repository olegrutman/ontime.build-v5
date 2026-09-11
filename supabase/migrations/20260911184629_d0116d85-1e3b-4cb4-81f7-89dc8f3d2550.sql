DROP POLICY IF EXISTS "Project participants can view proposals" ON public.co_proposals;
CREATE POLICY "Non-crew project participants can view proposals"
ON public.co_proposals
FOR SELECT
TO authenticated
USING (
  public.user_is_project_participant(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1
    FROM public.user_org_roles uor
    JOIN public.organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = auth.uid()
      AND o.type <> 'FC'::public.org_type
  )
);

DROP POLICY IF EXISTS "Project participants can view proposal items" ON public.co_proposal_items;
CREATE POLICY "Non-crew project participants can view proposal items"
ON public.co_proposal_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.co_proposals p
    WHERE p.id = co_proposal_items.proposal_id
      AND public.user_is_project_participant(auth.uid(), p.project_id)
      AND EXISTS (
        SELECT 1
        FROM public.user_org_roles uor
        JOIN public.organizations o ON o.id = uor.organization_id
        WHERE uor.user_id = auth.uid()
          AND o.type <> 'FC'::public.org_type
      )
  )
);

DROP POLICY IF EXISTS "Participants can view proposal milestones" ON public.co_proposal_milestones;
CREATE POLICY "Non-crew project participants can view proposal milestones"
ON public.co_proposal_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.co_proposals p
    WHERE p.id = co_proposal_milestones.proposal_id
      AND public.has_project_access(auth.uid(), p.project_id)
      AND EXISTS (
        SELECT 1
        FROM public.user_org_roles uor
        JOIN public.organizations o ON o.id = uor.organization_id
        WHERE uor.user_id = auth.uid()
          AND o.type <> 'FC'::public.org_type
      )
  )
);