DROP POLICY IF EXISTS "Users can view invoice line items" ON public.invoice_line_items;

CREATE POLICY "Users can view invoice line items"
ON public.invoice_line_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
      AND (
        EXISTS (
          SELECT 1 FROM public.project_contracts pc
          WHERE pc.id = i.contract_id
            AND (user_in_org(auth.uid(), pc.from_org_id) OR user_in_org(auth.uid(), pc.to_org_id))
        )
        OR (
          i.contract_id IS NULL AND i.po_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.purchase_orders po
            LEFT JOIN public.suppliers s ON s.id = po.supplier_id
            WHERE po.id = i.po_id
              AND (
                user_in_org(auth.uid(), s.organization_id)
                OR user_in_org(auth.uid(), po.organization_id)
                OR user_in_org(auth.uid(), po.created_by_org_id)
                OR user_in_org(auth.uid(), po.pricing_owner_org_id)
              )
          )
        )
      )
  )
);