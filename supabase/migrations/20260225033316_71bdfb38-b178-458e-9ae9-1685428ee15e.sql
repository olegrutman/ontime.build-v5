
-- Fix Bug 1: Case mismatch in project_team status check ('accepted' -> 'Accepted')
DROP POLICY "GC/TC can create returns" ON public.returns;
CREATE POLICY "GC/TC can create returns" ON public.returns
  FOR INSERT WITH CHECK (
    created_by_user_id = auth.uid()
    AND user_in_org(auth.uid(), created_by_org_id)
    AND EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = returns.project_id
        AND pt.org_id = returns.created_by_org_id
        AND pt.status = 'Accepted'
        AND pt.role IN ('General Contractor', 'Trade Contractor')
    )
  );

-- Fix Bug 2: Allow return_items insert when parent return is DRAFT or SUBMITTED
DROP POLICY "Creator can add return items to draft returns" ON public.return_items;
CREATE POLICY "Creator can add return items" ON public.return_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_items.return_id
        AND r.status IN ('DRAFT', 'SUBMITTED')
        AND user_in_org(auth.uid(), r.created_by_org_id)
    )
  );
