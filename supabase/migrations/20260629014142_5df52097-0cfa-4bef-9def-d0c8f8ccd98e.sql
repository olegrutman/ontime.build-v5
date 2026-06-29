CREATE POLICY "CO deletable by creator or owner org (non-final states)"
ON public.change_orders
FOR DELETE
TO authenticated
USING (
  status IN ('draft','shared','work_in_progress','closed_for_pricing','rejected','withdrawn')
  AND (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles uor
      WHERE uor.user_id = auth.uid()
        AND uor.organization_id = change_orders.org_id
    )
  )
);