
-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Access estimate items via estimate" ON public.supplier_estimate_items;

-- 1. SELECT: any project participant who can see the parent estimate can see its items
CREATE POLICY "Select estimate items via estimate"
ON public.supplier_estimate_items
FOR SELECT
TO authenticated
USING (
  estimate_id IN (
    SELECT se.id FROM supplier_estimates se
  )
);

-- 2. INSERT: only members of the supplier org that owns the estimate
CREATE POLICY "Supplier org members insert estimate items"
ON public.supplier_estimate_items
FOR INSERT
TO authenticated
WITH CHECK (
  estimate_id IN (
    SELECT se.id FROM supplier_estimates se
    WHERE se.supplier_org_id IN (
      SELECT uor.organization_id FROM user_org_roles uor
      WHERE uor.user_id = auth.uid()
    )
  )
);

-- 3. UPDATE: only members of the supplier org that owns the estimate
CREATE POLICY "Supplier org members update estimate items"
ON public.supplier_estimate_items
FOR UPDATE
TO authenticated
USING (
  estimate_id IN (
    SELECT se.id FROM supplier_estimates se
    WHERE se.supplier_org_id IN (
      SELECT uor.organization_id FROM user_org_roles uor
      WHERE uor.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  estimate_id IN (
    SELECT se.id FROM supplier_estimates se
    WHERE se.supplier_org_id IN (
      SELECT uor.organization_id FROM user_org_roles uor
      WHERE uor.user_id = auth.uid()
    )
  )
);

-- 4. DELETE: only members of the supplier org that owns the estimate
CREATE POLICY "Supplier org members delete estimate items"
ON public.supplier_estimate_items
FOR DELETE
TO authenticated
USING (
  estimate_id IN (
    SELECT se.id FROM supplier_estimates se
    WHERE se.supplier_org_id IN (
      SELECT uor.organization_id FROM user_org_roles uor
      WHERE uor.user_id = auth.uid()
    )
  )
);
