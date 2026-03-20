
CREATE POLICY "Users can select owned or assigned change orders (direct)"
ON public.change_orders
FOR SELECT
TO authenticated
USING (
  user_in_org(auth.uid(), org_id)
  OR (assigned_to_org_id IS NOT NULL AND user_in_org(auth.uid(), assigned_to_org_id))
);
