DROP POLICY IF EXISTS "Project participants can create invoice_external_invites" ON public.invoice_external_invites;
DROP POLICY IF EXISTS "Project participants can view invoice_external_invites" ON public.invoice_external_invites;

CREATE POLICY "Project participants can create invoice_external_invites"
ON public.invoice_external_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices inv
    WHERE inv.id = invoice_external_invites.invoice_id
      AND public.is_project_participant(auth.uid(), inv.project_id)
  )
);

CREATE POLICY "Project participants can view invoice_external_invites"
ON public.invoice_external_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices inv
    WHERE inv.id = invoice_external_invites.invoice_id
      AND public.is_project_participant(auth.uid(), inv.project_id)
  )
);