
-- Helper snippet: supplier org check via PO
-- (contract_id IS NULL AND po_id IS NOT NULL AND user belongs to PO supplier org)

-- 1. DROP affected policies
DROP POLICY IF EXISTS "Contractors can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Contractors can delete draft invoices" ON public.invoices;
DROP POLICY IF EXISTS "Contractors can update draft invoices" ON public.invoices;
DROP POLICY IF EXISTS "Clients can update submitted invoices" ON public.invoices;

-- 2. Recreate INSERT policy with PO-supplier path
CREATE POLICY "Contractors can create invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    -- Contract-based path (existing)
    EXISTS (
      SELECT 1 FROM project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
    )
    OR
    -- PO-supplier path (new)
    (
      contract_id IS NULL
      AND po_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = invoices.po_id
          AND public.user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
);

-- 3. Recreate DELETE policy with PO-supplier path
CREATE POLICY "Contractors can delete draft invoices"
ON public.invoices FOR DELETE TO authenticated
USING (
  status = 'DRAFT'
  AND created_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
    )
    OR
    (
      contract_id IS NULL
      AND po_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = invoices.po_id
          AND public.user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
);

-- 4. Recreate UPDATE policy for contractors (draft/rejected invoices)
CREATE POLICY "Contractors can update draft invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (
  status IN ('DRAFT', 'REJECTED')
  AND (
    EXISTS (
      SELECT 1 FROM project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
    )
    OR
    (
      contract_id IS NULL
      AND po_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = invoices.po_id
          AND public.user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
)
WITH CHECK (
  status IN ('DRAFT', 'SUBMITTED')
  AND (
    EXISTS (
      SELECT 1 FROM project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
    )
    OR
    (
      contract_id IS NULL
      AND po_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = invoices.po_id
          AND public.user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
);

-- 5. Recreate client UPDATE policy (unchanged)
CREATE POLICY "Clients can update submitted invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (
  status IN ('SUBMITTED', 'APPROVED')
  AND EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
      AND public.user_in_org(auth.uid(), pc.to_org_id)
  )
)
WITH CHECK (
  status IN ('APPROVED', 'REJECTED', 'PAID')
  AND EXISTS (
    SELECT 1 FROM project_contracts pc
    WHERE pc.id = invoices.contract_id
      AND public.user_in_org(auth.uid(), pc.to_org_id)
  )
);
