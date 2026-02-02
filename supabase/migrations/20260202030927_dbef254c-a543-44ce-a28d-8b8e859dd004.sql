-- Drop old restrictive GC_PM-only policies for catalog_items
DROP POLICY IF EXISTS "GC_PM can insert catalog items" ON catalog_items;
DROP POLICY IF EXISTS "GC_PM can update catalog items" ON catalog_items;
DROP POLICY IF EXISTS "GC_PM can delete catalog items" ON catalog_items;

-- New: Suppliers can manage their own catalog items
CREATE POLICY "Suppliers can manage own catalog items"
ON catalog_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN organizations o ON o.id = s.organization_id
    JOIN user_org_roles uor ON uor.organization_id = o.id
    WHERE s.id = catalog_items.supplier_id
    AND uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM suppliers s
    JOIN organizations o ON o.id = s.organization_id
    JOIN user_org_roles uor ON uor.organization_id = o.id
    WHERE s.id = catalog_items.supplier_id
    AND uor.user_id = auth.uid()
    AND o.type = 'SUPPLIER'
  )
);

-- Broader read access for all authenticated users to view supplier catalogs
CREATE POLICY "Authenticated users can view supplier catalogs"
ON catalog_items FOR SELECT
TO authenticated
USING (true);