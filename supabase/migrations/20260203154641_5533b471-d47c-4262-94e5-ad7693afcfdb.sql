-- Drop existing SELECT policy
DROP POLICY IF EXISTS "PO participants can view line items" ON po_line_items;

-- Create new policy that includes project participants via work order links
CREATE POLICY "PO participants can view line items" ON po_line_items
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id
      AND (
        -- Original: user in PO's org
        user_in_org(auth.uid(), po.organization_id)
        -- Original: supplier
        OR EXISTS (
          SELECT 1 FROM suppliers s
          WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
        )
        -- NEW: project team members for POs linked to work orders
        OR EXISTS (
          SELECT 1 FROM change_order_projects cop
          JOIN project_team pt ON pt.project_id = cop.project_id
          WHERE cop.linked_po_id = po.id
          AND pt.user_id = auth.uid()
        )
      )
    )
  );