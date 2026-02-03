-- Fix: Allow suppliers to see Purchase Orders assigned to them

-- 1. Update purchase_orders SELECT policy
DROP POLICY IF EXISTS "Org members can view POs" ON purchase_orders;

CREATE POLICY "Project participants and suppliers can view POs" 
ON purchase_orders FOR SELECT
USING (
  -- Creator org can view
  user_in_org(auth.uid(), organization_id)
  OR
  -- Supplier assigned to PO can view
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
);

-- 2. Update po_line_items SELECT policy
DROP POLICY IF EXISTS "Users can view PO line items" ON po_line_items;

CREATE POLICY "PO participants can view line items"
ON po_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND (
      -- Creator org can view
      user_in_org(auth.uid(), po.organization_id)
      OR
      -- Supplier can view
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
);