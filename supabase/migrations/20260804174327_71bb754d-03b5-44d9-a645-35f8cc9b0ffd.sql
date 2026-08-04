DROP POLICY IF EXISTS "Clients can update submitted invoices" ON public.invoices;

CREATE POLICY "Clients can update submitted invoices"
ON public.invoices
FOR UPDATE
USING (
  status = ANY (ARRAY['SUBMITTED'::text, 'APPROVED'::text])
  AND (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id AND user_in_org(auth.uid(), pc.to_org_id)
    )
    OR (
      invoices.contract_id IS NULL AND invoices.po_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = invoices.po_id
          AND (
            user_in_org(auth.uid(), po.organization_id)
            OR user_in_org(auth.uid(), po.pricing_owner_org_id)
          )
      )
    )
  )
)
WITH CHECK (
  status = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text, 'PAID'::text])
  AND (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id AND user_in_org(auth.uid(), pc.to_org_id)
    )
    OR (
      invoices.contract_id IS NULL AND invoices.po_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = invoices.po_id
          AND (
            user_in_org(auth.uid(), po.organization_id)
            OR user_in_org(auth.uid(), po.pricing_owner_org_id)
          )
      )
    )
  )
);