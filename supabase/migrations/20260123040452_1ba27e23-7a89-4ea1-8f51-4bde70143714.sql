-- Drop old policy (owner-org only)
DROP POLICY IF EXISTS "Org members can view work items" ON public.work_items;

-- Recreate SELECT policy with participant visibility
CREATE POLICY "Members or participants can view work items"
ON public.work_items
FOR SELECT
USING (
  -- Owner org members
  user_in_org(auth.uid(), organization_id)
  -- OR invited participant org members
  OR EXISTS (
    SELECT 1
    FROM public.work_item_participants p
    WHERE p.work_item_id = work_items.id
      AND user_in_org(auth.uid(), p.organization_id)
      -- If you want "accept required" later, uncomment:
      -- AND p.accepted_at IS NOT NULL
  )
);