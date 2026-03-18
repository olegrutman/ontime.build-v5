DROP POLICY IF EXISTS "Users can update their own org change orders" ON public.change_orders;

CREATE POLICY "Owner org can update change orders"
ON public.change_orders
FOR UPDATE
TO authenticated
USING (
  public.user_in_org(auth.uid(), org_id)
)
WITH CHECK (
  public.user_in_org(auth.uid(), org_id)
);

CREATE POLICY "Assigned org can work shared change orders"
ON public.change_orders
FOR UPDATE
TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND public.user_in_org(auth.uid(), assigned_to_org_id)
  AND status IN ('shared', 'rejected')
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND public.user_in_org(auth.uid(), assigned_to_org_id)
  AND status IN ('shared', 'submitted', 'rejected')
);

CREATE POLICY "Assigned org can decide submitted change orders"
ON public.change_orders
FOR UPDATE
TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND public.user_in_org(auth.uid(), assigned_to_org_id)
  AND status = 'submitted'
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND public.user_in_org(auth.uid(), assigned_to_org_id)
  AND status IN ('submitted', 'approved', 'rejected')
);