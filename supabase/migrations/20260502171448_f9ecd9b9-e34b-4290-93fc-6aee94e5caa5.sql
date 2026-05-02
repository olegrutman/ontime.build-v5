-- ============================================================
-- BUG 2: Add INSERT/UPDATE/DELETE policies on change_order_collaborators
-- ============================================================

-- Owner org can insert collaborators on their COs
CREATE POLICY "CO owner org can insert collaborators"
ON public.change_order_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_id
      AND user_in_org(auth.uid(), co.org_id)
  )
);

-- Collaborator org can update their own status (accept/reject/complete)
CREATE POLICY "Collaborator org can update own status"
ON public.change_order_collaborators
FOR UPDATE
TO authenticated
USING (user_in_org(auth.uid(), organization_id))
WITH CHECK (user_in_org(auth.uid(), organization_id));

-- Owner org can also update collaborator records
CREATE POLICY "CO owner org can update collaborators"
ON public.change_order_collaborators
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_id
      AND user_in_org(auth.uid(), co.org_id)
  )
);

-- Owner org can delete collaborators
CREATE POLICY "CO owner org can delete collaborators"
ON public.change_order_collaborators
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.change_orders co
    WHERE co.id = co_id
      AND user_in_org(auth.uid(), co.org_id)
  )
);

-- ============================================================
-- BUG 3: Fix co_sov_items SELECT to use can_access_change_order
-- ============================================================

DROP POLICY IF EXISTS "Users can view co_sov_items for their org" ON public.co_sov_items;

CREATE POLICY "SOV items readable by co participants"
ON public.co_sov_items
FOR SELECT
TO authenticated
USING (can_access_change_order(co_id));

-- ============================================================
-- BUG 5: Fix co_nte_log policies to use can_access_change_order
-- ============================================================

DROP POLICY IF EXISTS "NTE log readable by co participants" ON public.co_nte_log;
DROP POLICY IF EXISTS "NTE log insertable by co participants" ON public.co_nte_log;
DROP POLICY IF EXISTS "NTE log updatable by co participants" ON public.co_nte_log;

CREATE POLICY "NTE log readable by co participants"
ON public.co_nte_log
FOR SELECT
TO authenticated
USING (can_access_change_order(co_id));

CREATE POLICY "NTE log insertable by co participants"
ON public.co_nte_log
FOR INSERT
TO authenticated
WITH CHECK (can_access_change_order(co_id));

CREATE POLICY "NTE log updatable by co participants"
ON public.co_nte_log
FOR UPDATE
TO authenticated
USING (can_access_change_order(co_id));