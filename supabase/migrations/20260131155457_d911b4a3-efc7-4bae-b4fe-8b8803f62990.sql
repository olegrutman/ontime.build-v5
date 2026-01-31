-- Drop and recreate the RLS policy for change_order_materials with correct role name
DROP POLICY IF EXISTS "TC and Supplier can manage materials" ON change_order_materials;

-- Create policy that allows TC, Supplier, and GC to manage materials
-- GC via project_team with role 'General Contractor'
CREATE POLICY "TC, Supplier, and GC can manage materials"
ON change_order_materials
FOR ALL
USING (
  -- TC and Supplier via change_order_participants
  (EXISTS (
    SELECT 1
    FROM change_order_participants cop
    JOIN user_org_roles uor ON uor.organization_id = cop.organization_id
    WHERE cop.change_order_id = change_order_materials.change_order_id
    AND uor.user_id = auth.uid()
    AND cop.role IN ('TC', 'SUPPLIER')
  ))
  OR
  -- GC via project_team (correct role name: 'General Contractor')
  (EXISTS (
    SELECT 1
    FROM change_order_projects co
    JOIN project_team pt ON pt.project_id = co.project_id
    WHERE co.id = change_order_materials.change_order_id
    AND pt.user_id = auth.uid()
    AND pt.role = 'General Contractor'
  ))
  OR
  -- TC via project_team (role: 'Trade Contractor')
  (EXISTS (
    SELECT 1
    FROM change_order_projects co
    JOIN project_team pt ON pt.project_id = co.project_id
    WHERE co.id = change_order_materials.change_order_id
    AND pt.user_id = auth.uid()
    AND pt.role = 'Trade Contractor'
  ))
);