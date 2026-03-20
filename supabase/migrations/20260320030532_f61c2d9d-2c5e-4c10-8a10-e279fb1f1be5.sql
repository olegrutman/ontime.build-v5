DROP POLICY "Users can insert change orders for their org" ON public.change_orders;

CREATE POLICY "Users can insert change orders for their org"
ON public.change_orders
FOR INSERT
TO authenticated
WITH CHECK (user_in_org(auth.uid(), org_id));