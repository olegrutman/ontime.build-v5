ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by UUID,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status = ANY (ARRAY['DRAFT','SUBMITTED','APPROVED','REJECTED','PAID','VOIDED']));

DROP POLICY IF EXISTS "Billing party can void invoices" ON public.invoices;
CREATE POLICY "Billing party can void invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  status IN ('DRAFT','REJECTED')
  AND (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
    )
    OR (
      invoices.contract_id IS NULL AND invoices.po_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.suppliers s ON s.id = po.supplier_id
        WHERE po.id = invoices.po_id
          AND public.user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
)
WITH CHECK (
  status = 'VOIDED'
  AND void_reason IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
    )
    OR (
      invoices.contract_id IS NULL AND invoices.po_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.purchase_orders po
        JOIN public.suppliers s ON s.id = po.supplier_id
        WHERE po.id = invoices.po_id
          AND public.user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
);