-- Part 1: Schema Changes

-- 1.1 Add created_by_org_id to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS created_by_org_id uuid REFERENCES organizations(id);

-- 1.2 Add pricing_owner_org_id to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS pricing_owner_org_id uuid REFERENCES organizations(id);

-- 1.3 Add lead_time_days and supplier_notes to po_line_items
ALTER TABLE po_line_items 
ADD COLUMN IF NOT EXISTS lead_time_days integer;

ALTER TABLE po_line_items 
ADD COLUMN IF NOT EXISTS supplier_notes text;

-- 1.4 Add FINALIZED status to po_status enum
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'FINALIZED' AFTER 'DELIVERED';

-- Part 2: Pricing Visibility Function

-- Create function to check if user can view PO pricing
CREATE OR REPLACE FUNCTION public.can_view_po_pricing(po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = $1
    AND (
      -- Pricing owner org can view
      user_in_org(auth.uid(), po.pricing_owner_org_id)
      OR
      -- Supplier can view their own pricing
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
    )
  );
$$;

-- Part 3: Supplier Pricing Update Policy

-- Drop existing supplier update policy if exists
DROP POLICY IF EXISTS "Supplier can update pricing on SUBMITTED POs" ON po_line_items;

-- Create policy for suppliers to update pricing on SUBMITTED POs
CREATE POLICY "Supplier can update pricing on SUBMITTED POs" ON po_line_items
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = po_line_items.po_id
      AND po.status = 'SUBMITTED'
      AND user_in_org(auth.uid(), s.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = po_line_items.po_id
      AND po.status = 'SUBMITTED'
      AND user_in_org(auth.uid(), s.organization_id)
  )
);

-- Part 4: Supplier Status Update Policy for POs

-- Allow suppliers to update PO status from SUBMITTED to PRICED
DROP POLICY IF EXISTS "Supplier can mark PO as priced" ON purchase_orders;

CREATE POLICY "Supplier can mark PO as priced" ON purchase_orders
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  AND status = 'SUBMITTED'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  AND status IN ('SUBMITTED', 'PRICED')
);

-- Allow suppliers to update status from PRICED to ORDERED
DROP POLICY IF EXISTS "Supplier can mark PO as ordered" ON purchase_orders;

CREATE POLICY "Supplier can mark PO as ordered" ON purchase_orders
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  AND status = 'PRICED'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  AND status IN ('PRICED', 'ORDERED')
);

-- Allow suppliers to update status from ORDERED to DELIVERED
DROP POLICY IF EXISTS "Supplier can mark PO as delivered" ON purchase_orders;

CREATE POLICY "Supplier can mark PO as delivered" ON purchase_orders
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  AND status = 'ORDERED'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  AND status IN ('ORDERED', 'DELIVERED')
);