-- Fix purchase_orders UPDATE policy to allow ACTIVE → SUBMITTED transition
DROP POLICY IF EXISTS "PM roles can update active POs" ON purchase_orders;

CREATE POLICY "PM roles can update active POs" ON purchase_orders
  FOR UPDATE TO public
  USING (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  )
  WITH CHECK (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid())
    AND status IN ('ACTIVE', 'SUBMITTED')
  );