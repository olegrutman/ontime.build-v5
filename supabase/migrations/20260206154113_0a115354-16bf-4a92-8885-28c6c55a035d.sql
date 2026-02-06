
-- 1. Drop old duplicate purchase_orders SELECT policy
DROP POLICY IF EXISTS "Project participants and suppliers can view POs" ON purchase_orders;

-- 2. Drop current (broken) purchase_orders SELECT policy
DROP POLICY IF EXISTS "Project team and suppliers can view POs" ON purchase_orders;

-- 3. Recreate with correct case: 'Accepted' instead of 'ACCEPTED'
CREATE POLICY "Project team and suppliers can view POs"
ON purchase_orders FOR SELECT
USING (
  user_in_org(auth.uid(), organization_id)
  OR
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  OR
  (
    purchase_orders.project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = purchase_orders.project_id
        AND pt.org_id = get_user_org_id(auth.uid())
        AND pt.status = 'Accepted'
    )
  )
);

-- 4. Drop current (broken) po_line_items SELECT policy
DROP POLICY IF EXISTS "PO participants can view line items" ON po_line_items;
DROP POLICY IF EXISTS "PO team and suppliers can view line items" ON po_line_items;

-- 5. Recreate with correct case
CREATE POLICY "PO team and suppliers can view line items"
ON po_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND (
      user_in_org(auth.uid(), po.organization_id)
      OR
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
      OR
      (
        po.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM project_team pt
          WHERE pt.project_id = po.project_id
            AND pt.org_id = get_user_org_id(auth.uid())
            AND pt.status = 'Accepted'
        )
      )
    )
  )
);
