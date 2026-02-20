
-- Part 1-3: Update purchase_orders RLS policies to use user_in_org instead of get_user_org_id

DROP POLICY IF EXISTS "PM roles can create POs" ON purchase_orders;
CREATE POLICY "PM roles can create POs" ON purchase_orders
  FOR INSERT WITH CHECK (
    is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "PM roles can update active POs" ON purchase_orders;
CREATE POLICY "PM roles can update active POs" ON purchase_orders
  FOR UPDATE USING (
    is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "GC_PM can update any PO" ON purchase_orders;
CREATE POLICY "GC_PM can update any PO" ON purchase_orders
  FOR UPDATE USING (
    is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "GC_PM can delete active POs" ON purchase_orders;
CREATE POLICY "GC_PM can delete active POs" ON purchase_orders
  FOR DELETE USING (
    is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id)
  );

-- Part 4: Fix get_user_org_id for determinism
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_org_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$$;
