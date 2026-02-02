-- Allow SUPPLIER orgs to create their own supplier record
CREATE POLICY "Supplier orgs can create own record"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_org_roles uor
    JOIN organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = auth.uid()
    AND uor.organization_id = suppliers.organization_id
    AND o.type = 'SUPPLIER'
  )
);

-- Allow SUPPLIER org members to view their own supplier record
CREATE POLICY "Supplier orgs can view own record"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_org_roles uor
    JOIN organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = auth.uid()
    AND uor.organization_id = suppliers.organization_id
    AND o.type = 'SUPPLIER'
  )
);