-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Contractors can create invoices for their contracts" ON public.invoices;

-- Create corrected INSERT policy
-- Invoice creator is from_org (contractor), sending invoice to to_org (client)
-- TC (from_org) invoices GC (to_org)
-- FC (from_org) invoices TC (to_org)  
CREATE POLICY "Contractors can create invoices for their contracts"
ON public.invoices FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND pc.from_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);

-- Also fix DELETE policy to match
DROP POLICY IF EXISTS "Contractors can delete their draft invoices" ON public.invoices;

CREATE POLICY "Contractors can delete their draft invoices"
ON public.invoices FOR DELETE
USING (
  status = 'DRAFT' AND
  EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND pc.from_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);

-- Fix UPDATE policy to use correct direction
DROP POLICY IF EXISTS "Users can update invoices based on contract role" ON public.invoices;

CREATE POLICY "Users can update invoices based on contract role"
ON public.invoices FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND (
      -- Creator (from_org) can update drafts
      (pc.from_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()) AND invoices.status = 'DRAFT')
      OR
      -- Receiver (to_org) can approve/reject/pay submitted invoices
      (pc.to_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()) AND invoices.status IN ('SUBMITTED', 'APPROVED'))
    )
  )
);