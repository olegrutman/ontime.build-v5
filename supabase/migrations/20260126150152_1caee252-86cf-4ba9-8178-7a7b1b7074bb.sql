
-- =====================================================
-- FIX: Contract-Based Data Partitioning for Invoices, SOVs
-- Ensure GC cannot see FC data, FC cannot see GC data
-- =====================================================

-- 1. Drop existing invoice SELECT policy
DROP POLICY IF EXISTS "Users can view invoices for their projects" ON public.invoices;

-- 2. Create new contract-aware invoice SELECT policy
-- Users can view invoices where:
-- a) They created the invoice
-- b) Their org is the "from" side of the contract (payer - can see invoices sent to them)
-- c) Their org is the "to" side of the contract (payee - can see invoices they created)
CREATE POLICY "Users can view invoices for their contracts"
ON public.invoices
FOR SELECT
USING (
  -- Allow if user created the invoice
  created_by = auth.uid()
  OR
  -- Allow if invoice's contract involves user's organization
  EXISTS (
    SELECT 1 FROM project_contracts pc
    JOIN user_org_roles uor ON (
      uor.organization_id = pc.from_org_id 
      OR uor.organization_id = pc.to_org_id
    )
    WHERE pc.id = invoices.contract_id
    AND uor.user_id = auth.uid()
  )
  OR
  -- Allow project owner to see invoices without contract_id (legacy)
  (
    invoices.contract_id IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = invoices.project_id
      AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
    )
  )
);

-- 3. Drop existing SOV SELECT policy  
DROP POLICY IF EXISTS "Project members can view project SOV" ON public.project_sov;

-- 4. Create new contract-aware SOV SELECT policy
CREATE POLICY "Users can view SOV for their contracts"
ON public.project_sov
FOR SELECT
USING (
  -- Allow if SOV's contract involves user's organization
  EXISTS (
    SELECT 1 FROM project_contracts pc
    JOIN user_org_roles uor ON (
      uor.organization_id = pc.from_org_id 
      OR uor.organization_id = pc.to_org_id
    )
    WHERE pc.id = project_sov.contract_id
    AND uor.user_id = auth.uid()
  )
  OR
  -- Allow project owner to see SOVs without contract_id (legacy)
  (
    project_sov.contract_id IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_sov.project_id
      AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
    )
  )
);

-- 5. Drop existing SOV items SELECT policy
DROP POLICY IF EXISTS "Project members can view SOV items" ON public.project_sov_items;

-- 6. Create new contract-aware SOV items SELECT policy
CREATE POLICY "Users can view SOV items for their contracts"
ON public.project_sov_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_sov ps
    JOIN project_contracts pc ON pc.id = ps.contract_id
    JOIN user_org_roles uor ON (
      uor.organization_id = pc.from_org_id 
      OR uor.organization_id = pc.to_org_id
    )
    WHERE ps.id = project_sov_items.sov_id
    AND uor.user_id = auth.uid()
  )
  OR
  -- Allow for SOVs without contract (legacy)
  EXISTS (
    SELECT 1 FROM project_sov ps
    JOIN projects p ON p.id = ps.project_id
    WHERE ps.id = project_sov_items.sov_id
    AND ps.contract_id IS NULL
    AND (p.created_by = auth.uid() OR user_in_org(auth.uid(), p.organization_id))
  )
);

-- 7. Update project_contracts SELECT policy to be more explicit
DROP POLICY IF EXISTS "Users can view contracts for their projects" ON public.project_contracts;

CREATE POLICY "Users can view their organization's contracts"
ON public.project_contracts
FOR SELECT
USING (
  -- User's org is the payer (from side)
  EXISTS (
    SELECT 1 FROM user_org_roles uor
    WHERE uor.user_id = auth.uid()
    AND uor.organization_id = project_contracts.from_org_id
  )
  OR
  -- User's org is the payee (to side)
  EXISTS (
    SELECT 1 FROM user_org_roles uor
    WHERE uor.user_id = auth.uid()
    AND uor.organization_id = project_contracts.to_org_id
  )
  OR
  -- User created the project (for project owners during setup)
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_contracts.project_id
    AND p.created_by = auth.uid()
  )
);
