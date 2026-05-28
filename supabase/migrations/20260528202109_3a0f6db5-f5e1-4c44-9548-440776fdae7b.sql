DROP POLICY IF EXISTS "Contractors can update invoice line items" ON public.invoice_line_items;

CREATE POLICY "Participants can update invoice line items"
ON public.invoice_line_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
      AND i.status NOT IN ('APPROVED','PAID')
      AND public.is_project_participant(auth.uid(), i.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
      AND i.status NOT IN ('APPROVED','PAID')
      AND public.is_project_participant(auth.uid(), i.project_id)
  )
);