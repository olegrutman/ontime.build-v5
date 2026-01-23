-- Fix infinite recursion in projects RLS by using security definer function
DROP POLICY IF EXISTS "Participants can view invited projects" ON projects;

-- Create a security definer function to check if user is a project participant
CREATE OR REPLACE FUNCTION public.user_is_project_participant(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_participants pp
    JOIN user_org_roles uor ON uor.organization_id = pp.organization_id
    WHERE pp.project_id = _project_id
    AND uor.user_id = _user_id
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Participants can view invited projects"
ON projects FOR SELECT
USING (user_is_project_participant(auth.uid(), id));