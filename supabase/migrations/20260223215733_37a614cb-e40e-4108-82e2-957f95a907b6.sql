
-- Fix: Allow contractors (from_org) to update REJECTED invoices back to DRAFT
-- The USING clause currently only allows from_org to update DRAFT invoices.
-- We need to also allow updating REJECTED invoices so the revision flow can work.

DROP POLICY "Users can update invoices based on contract role" ON public.invoices;

CREATE POLICY "Users can update invoices based on contract role"
ON public.invoices
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND (
      (pc.from_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status IN ('DRAFT', 'REJECTED'))
      OR
      (pc.to_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status IN ('SUBMITTED', 'APPROVED'))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND (
      (pc.from_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status IN ('DRAFT', 'SUBMITTED'))
      OR
      (pc.to_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status IN ('APPROVED', 'REJECTED', 'PAID'))
    )
  )
);
