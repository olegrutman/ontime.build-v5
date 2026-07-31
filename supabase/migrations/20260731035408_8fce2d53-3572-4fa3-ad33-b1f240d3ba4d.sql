GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

DROP POLICY IF EXISTS "Members with manage permission can update organization" ON public.organizations;
CREATE POLICY "Members with manage permission can update organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT uor.organization_id
    FROM user_org_roles uor
    LEFT JOIN member_permissions mp ON mp.user_org_role_id = uor.id
    WHERE uor.user_id = auth.uid()
      AND (uor.is_admin = true OR mp.can_manage_team = true)
  )
)
WITH CHECK (
  id IN (
    SELECT uor.organization_id
    FROM user_org_roles uor
    LEFT JOIN member_permissions mp ON mp.user_org_role_id = uor.id
    WHERE uor.user_id = auth.uid()
      AND (uor.is_admin = true OR mp.can_manage_team = true)
  )
);