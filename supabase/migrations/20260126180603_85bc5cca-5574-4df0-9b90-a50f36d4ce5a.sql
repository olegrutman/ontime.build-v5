
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "TC can manage their labor" ON public.change_order_tc_labor;

-- Create new policy that allows TC project team members to manage labor
-- This checks if the user is on the project team as a Trade Contractor
CREATE POLICY "TC can manage their labor" ON public.change_order_tc_labor
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM change_order_projects cop
    JOIN project_team pt ON pt.project_id = cop.project_id
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE cop.id = change_order_tc_labor.change_order_id
      AND uor.user_id = auth.uid()
      AND pt.role = 'Trade Contractor'
      AND pt.status = 'Accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM change_order_projects cop
    JOIN project_team pt ON pt.project_id = cop.project_id
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE cop.id = change_order_tc_labor.change_order_id
      AND uor.user_id = auth.uid()
      AND pt.role = 'Trade Contractor'
      AND pt.status = 'Accepted'
  )
);

-- Also fix FC hours policy for consistency
DROP POLICY IF EXISTS "FC can manage their hours" ON public.change_order_fc_hours;

CREATE POLICY "FC can manage their hours" ON public.change_order_fc_hours
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM change_order_projects cop
    JOIN project_team pt ON pt.project_id = cop.project_id
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE cop.id = change_order_fc_hours.change_order_id
      AND uor.user_id = auth.uid()
      AND pt.role = 'Field Crew'
      AND pt.status = 'Accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM change_order_projects cop
    JOIN project_team pt ON pt.project_id = cop.project_id
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE cop.id = change_order_fc_hours.change_order_id
      AND uor.user_id = auth.uid()
      AND pt.role = 'Field Crew'
      AND pt.status = 'Accepted'
  )
);

-- Update view policy too
DROP POLICY IF EXISTS "FC and TC can view FC hours" ON public.change_order_fc_hours;

CREATE POLICY "FC and TC can view FC hours" ON public.change_order_fc_hours
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM change_order_projects cop
    JOIN project_team pt ON pt.project_id = cop.project_id
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE cop.id = change_order_fc_hours.change_order_id
      AND uor.user_id = auth.uid()
      AND pt.role IN ('Trade Contractor', 'Field Crew')
      AND pt.status = 'Accepted'
  )
);
