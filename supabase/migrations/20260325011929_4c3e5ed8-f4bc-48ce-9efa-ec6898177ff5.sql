
-- Drop overly broad team policies on project_sov
DROP POLICY IF EXISTS "Project team can view SOVs" ON project_sov;
DROP POLICY IF EXISTS "Project team can manage SOVs" ON project_sov;

-- Drop overly broad team policies on project_sov_items
DROP POLICY IF EXISTS "Project team can view SOV items" ON project_sov_items;
DROP POLICY IF EXISTS "Project team can manage SOV items" ON project_sov_items;
