-- Fix organizations SELECT policy to allow looking up orgs by code for joining
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Allow authenticated users to view organizations (needed for join by code)
CREATE POLICY "Authenticated users can view organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix user_org_roles INSERT policy
DROP POLICY IF EXISTS "PMs can insert org roles" ON public.user_org_roles;

-- Allow users to insert their own org role (for joining orgs)
CREATE POLICY "Users can insert their own org roles"
  ON public.user_org_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow PMs to insert roles for others (for invitations)
CREATE POLICY "PMs can insert roles for others"
  ON public.user_org_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_pm_role(auth.uid()));