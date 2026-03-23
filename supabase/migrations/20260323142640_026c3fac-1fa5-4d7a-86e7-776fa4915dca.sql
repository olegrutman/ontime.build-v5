CREATE POLICY "Assigned org can update approved change orders"
ON public.change_orders
FOR UPDATE
TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = 'approved'
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = 'approved'
);