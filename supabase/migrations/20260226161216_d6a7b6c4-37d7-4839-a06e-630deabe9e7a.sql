
-- Step 1: Create security definer function to bypass nested RLS
CREATE OR REPLACE FUNCTION public.org_shares_project_with_user(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_participants pp1
    JOIN project_participants pp2 ON pp1.project_id = pp2.project_id
    WHERE pp1.organization_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
    AND pp2.organization_id = _org_id
  )
$$;

-- Step 2: Replace the organizations SELECT policy
DROP POLICY IF EXISTS "Users can view related organizations" ON public.organizations;

CREATE POLICY "Users can view related organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (
  id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
  OR org_shares_project_with_user(id)
  OR id IN (
    SELECT partner_org_id FROM trusted_partners
    WHERE organization_id IN (
      SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid()
    )
  )
);
