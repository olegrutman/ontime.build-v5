-- Drop existing restrictive project policies and replace with proper ones
DROP POLICY IF EXISTS "GC_PM can create projects" ON projects;
DROP POLICY IF EXISTS "GC_PM can update projects" ON projects;
DROP POLICY IF EXISTS "GC_PM can delete projects" ON projects;
DROP POLICY IF EXISTS "Org members can view projects" ON projects;

-- Create function to check if user is a PM (GC_PM or TC_PM)
CREATE OR REPLACE FUNCTION public.is_gc_or_tc_pm(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_org_roles uor
    JOIN organizations o ON o.id = uor.organization_id
    WHERE uor.user_id = _user_id 
    AND uor.role IN ('GC_PM', 'TC_PM')
    AND o.type IN ('GC', 'TC')
  )
$$;

-- PM roles (GC_PM or TC_PM) can create projects for their organization
CREATE POLICY "PM roles can create projects"
ON projects FOR INSERT
WITH CHECK (
  is_pm_role(auth.uid()) 
  AND organization_id = get_user_org_id(auth.uid())
  AND created_by = auth.uid()
);

-- PM roles can update their own org's projects
CREATE POLICY "PM roles can update projects"
ON projects FOR UPDATE
USING (
  is_pm_role(auth.uid()) 
  AND organization_id = get_user_org_id(auth.uid())
);

-- PM roles can delete their own org's projects (draft only)
CREATE POLICY "PM roles can delete draft projects"
ON projects FOR DELETE
USING (
  is_pm_role(auth.uid()) 
  AND organization_id = get_user_org_id(auth.uid())
  AND status = 'draft'
);

-- All org members can view their org's projects
CREATE POLICY "Org members can view own projects"
ON projects FOR SELECT
USING (user_in_org(auth.uid(), organization_id));

-- Project participants can view projects they're invited to
CREATE POLICY "Participants can view invited projects"
ON projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = projects.id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
);

-- Fix project_participants INSERT policy to allow project creators
DROP POLICY IF EXISTS "GC_PM can manage project participants" ON project_participants;

CREATE POLICY "Project creators can add participants"
ON project_participants FOR INSERT
WITH CHECK (
  is_pm_role(auth.uid())
  AND invited_by = auth.uid()
  AND (
    -- Can add to own org's projects
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_participants.project_id 
      AND user_in_org(auth.uid(), p.organization_id)
    )
    OR
    -- Or if they're already a participant
    EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = project_participants.project_id
      AND user_in_org(auth.uid(), pp.organization_id)
      AND pp.invite_status = 'ACCEPTED'
    )
  )
);

-- PM roles can update participants on their projects
CREATE POLICY "PM roles can update participants"
ON project_participants FOR UPDATE
USING (
  is_pm_role(auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_participants.project_id 
      AND user_in_org(auth.uid(), p.organization_id)
    )
    OR user_in_org(auth.uid(), organization_id)
  )
);

-- PM roles can delete participants from their projects
CREATE POLICY "PM roles can delete participants"
ON project_participants FOR DELETE
USING (
  is_pm_role(auth.uid())
  AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_participants.project_id 
    AND user_in_org(auth.uid(), p.organization_id)
  )
);

-- Participants can view their own participation
CREATE POLICY "Users can view their participation"
ON project_participants FOR SELECT
USING (
  user_in_org(auth.uid(), organization_id)
  OR EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_participants.project_id 
    AND user_in_org(auth.uid(), p.organization_id)
  )
);