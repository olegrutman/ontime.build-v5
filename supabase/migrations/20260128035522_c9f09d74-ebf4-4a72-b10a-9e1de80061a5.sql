-- Fix the UPDATE policy to allow proper status transitions
-- The current policy uses only USING clause, which also gets applied as WITH CHECK
-- We need separate USING (which rows can be accessed) and WITH CHECK (what values are allowed)

DROP POLICY IF EXISTS "Users can update invoices based on contract role" ON public.invoices;

-- Create a new policy with proper USING and WITH CHECK clauses
-- USING: determines which rows the user can update
-- WITH CHECK: validates the new row values after update

CREATE POLICY "Users can update invoices based on contract role"
ON public.invoices
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
    AND (
      -- from_org (contractor) can update their DRAFT invoices
      (pc.from_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status = 'DRAFT')
      OR
      -- to_org (client) can update SUBMITTED or APPROVED invoices
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
      -- from_org can transition DRAFT -> SUBMITTED (or keep as DRAFT)
      (pc.from_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status IN ('DRAFT', 'SUBMITTED'))
      OR
      -- to_org can transition SUBMITTED -> APPROVED/REJECTED, or APPROVED -> PAID
      (pc.to_org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
       AND invoices.status IN ('APPROVED', 'REJECTED', 'PAID'))
    )
  )
);