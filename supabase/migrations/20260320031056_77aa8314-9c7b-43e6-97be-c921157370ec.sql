DROP POLICY "Line items insertable by co owner org" ON public.co_line_items;

CREATE POLICY "Line items insertable by co owner org"
ON public.co_line_items
FOR INSERT
TO authenticated
WITH CHECK (user_in_org(auth.uid(), org_id));