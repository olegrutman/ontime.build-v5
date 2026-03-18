-- Allow the assigned org to continue working combined change orders
DROP POLICY IF EXISTS "Assigned org can work shared change orders" ON public.change_orders;

CREATE POLICY "Assigned org can work active change orders"
ON public.change_orders
FOR UPDATE
TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND public.user_in_org(auth.uid(), assigned_to_org_id)
  AND status = ANY (ARRAY['shared'::text, 'rejected'::text, 'combined'::text])
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND public.user_in_org(auth.uid(), assigned_to_org_id)
  AND status = ANY (ARRAY['shared'::text, 'submitted'::text, 'rejected'::text, 'combined'::text])
);