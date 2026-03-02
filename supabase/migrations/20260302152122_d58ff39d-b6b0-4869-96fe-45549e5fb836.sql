
-- Fix invoice_line_items RLS policies to support supplier invoices (contract_id IS NULL, po_id IS NOT NULL)

-- 1. DROP all existing policies on invoice_line_items
DROP POLICY IF EXISTS "Users can view invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can insert invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can delete invoice line items" ON public.invoice_line_items;

-- 2. SELECT: contract-based OR PO-supplier OR PO-buyer
CREATE POLICY "Users can view invoice line items"
ON public.invoice_line_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND (
      -- Contract-based path
      EXISTS (
        SELECT 1 FROM project_contracts pc
        WHERE pc.id = i.contract_id
        AND (public.user_in_org(auth.uid(), pc.from_org_id)
             OR public.user_in_org(auth.uid(), pc.to_org_id))
      )
      OR
      -- PO-supplier path
      (i.contract_id IS NULL AND i.po_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = i.po_id
         AND public.user_in_org(auth.uid(), s.organization_id)
       ))
      OR
      -- PO-buyer path (GC/TC viewing supplier invoices)
      (i.contract_id IS NULL AND i.po_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM purchase_orders po
         WHERE po.id = i.po_id
         AND public.user_in_org(auth.uid(), po.organization_id)
       ))
    )
  )
);

-- 3. INSERT: contract from_org OR PO-supplier, invoice must be DRAFT
CREATE POLICY "Contractors can insert invoice line items"
ON public.invoice_line_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND (
      EXISTS (
        SELECT 1 FROM project_contracts pc
        WHERE pc.id = i.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
      )
      OR
      (i.contract_id IS NULL AND i.po_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = i.po_id
         AND public.user_in_org(auth.uid(), s.organization_id)
       ))
    )
  )
);

-- 4. UPDATE: same as INSERT
CREATE POLICY "Contractors can update invoice line items"
ON public.invoice_line_items FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND (
      EXISTS (
        SELECT 1 FROM project_contracts pc
        WHERE pc.id = i.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
      )
      OR
      (i.contract_id IS NULL AND i.po_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = i.po_id
         AND public.user_in_org(auth.uid(), s.organization_id)
       ))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND (
      EXISTS (
        SELECT 1 FROM project_contracts pc
        WHERE pc.id = i.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
      )
      OR
      (i.contract_id IS NULL AND i.po_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = i.po_id
         AND public.user_in_org(auth.uid(), s.organization_id)
       ))
    )
  )
);

-- 5. DELETE: same as UPDATE
CREATE POLICY "Contractors can delete invoice line items"
ON public.invoice_line_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND (
      EXISTS (
        SELECT 1 FROM project_contracts pc
        WHERE pc.id = i.contract_id
        AND public.user_in_org(auth.uid(), pc.from_org_id)
      )
      OR
      (i.contract_id IS NULL AND i.po_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM purchase_orders po
         JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = i.po_id
         AND public.user_in_org(auth.uid(), s.organization_id)
       ))
    )
  )
);

-- 6. Also update the "Clients can update submitted invoices" policy to support PO-buyer approvals
DROP POLICY IF EXISTS "Clients can update submitted invoices" ON public.invoices;
CREATE POLICY "Clients can update submitted invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (
  status IN ('SUBMITTED', 'APPROVED')
  AND (
    EXISTS (
      SELECT 1 FROM project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.to_org_id)
    )
    OR
    (contract_id IS NULL AND po_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM purchase_orders po
       WHERE po.id = invoices.po_id
       AND public.user_in_org(auth.uid(), po.organization_id)
     ))
  )
)
WITH CHECK (
  status IN ('APPROVED', 'REJECTED', 'PAID')
  AND (
    EXISTS (
      SELECT 1 FROM project_contracts pc
      WHERE pc.id = invoices.contract_id
        AND public.user_in_org(auth.uid(), pc.to_org_id)
    )
    OR
    (contract_id IS NULL AND po_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM purchase_orders po
       WHERE po.id = invoices.po_id
       AND public.user_in_org(auth.uid(), po.organization_id)
     ))
  )
);
