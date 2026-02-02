-- Fix po_line_items INSERT policy
DROP POLICY IF EXISTS "PM roles can insert line items for draft POs" ON po_line_items;
CREATE POLICY "PM roles can insert line items for active POs" ON po_line_items
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id 
        AND po.status = 'ACTIVE'
        AND is_pm_role(auth.uid()) 
        AND user_in_org(auth.uid(), po.organization_id)
    )
  );

-- Fix po_line_items UPDATE policy  
DROP POLICY IF EXISTS "PM roles can update line items for draft POs" ON po_line_items;
CREATE POLICY "PM roles can update line items for active POs" ON po_line_items
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id 
        AND po.status = 'ACTIVE'
        AND is_pm_role(auth.uid()) 
        AND user_in_org(auth.uid(), po.organization_id)
    )
  );

-- Fix po_line_items DELETE policy
DROP POLICY IF EXISTS "PM roles can delete line items from draft POs" ON po_line_items;
CREATE POLICY "PM roles can delete line items from active POs" ON po_line_items
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id 
        AND po.status = 'ACTIVE'
        AND is_pm_role(auth.uid()) 
        AND user_in_org(auth.uid(), po.organization_id)
    )
  );

-- Fix purchase_orders DELETE policy
DROP POLICY IF EXISTS "GC_PM can delete draft POs" ON purchase_orders;
CREATE POLICY "GC_PM can delete active POs" ON purchase_orders
  FOR DELETE TO public
  USING (
    is_gc_pm(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  );

-- Fix purchase_orders UPDATE policy for PM roles
DROP POLICY IF EXISTS "PM roles can update draft POs" ON purchase_orders;
CREATE POLICY "PM roles can update active POs" ON purchase_orders
  FOR UPDATE TO public
  USING (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  );