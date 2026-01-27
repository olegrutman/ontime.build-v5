-- Fix invoice_line_items RLS policies
-- The INSERT policy incorrectly checks to_org_id instead of from_org_id
-- Invoice direction: from_org (contractor/sender) creates invoices, to_org (client) receives them

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Contractors can manage invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Contractors can delete invoice line items" ON public.invoice_line_items;

-- Recreate INSERT policy with correct from_org_id check
-- The invoice creator (from_org) should be able to add line items to their DRAFT invoices
CREATE POLICY "Contractors can insert invoice line items"
ON public.invoice_line_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN project_contracts pc ON pc.id = i.contract_id
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND pc.from_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);

-- Recreate UPDATE policy - from_org can update line items in DRAFT invoices
CREATE POLICY "Contractors can update invoice line items"
ON public.invoice_line_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN project_contracts pc ON pc.id = i.contract_id
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND pc.from_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);

-- Recreate DELETE policy - from_org can delete line items in DRAFT invoices
CREATE POLICY "Contractors can delete invoice line items"
ON public.invoice_line_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    JOIN project_contracts pc ON pc.id = i.contract_id
    WHERE i.id = invoice_line_items.invoice_id
    AND i.status = 'DRAFT'
    AND pc.from_org_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);