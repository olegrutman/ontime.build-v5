-- Create project_guests table for external viewer support
CREATE TABLE IF NOT EXISTS project_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_level TEXT DEFAULT 'Viewer' CHECK (access_level IN ('Viewer', 'Commenter')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, email)
);

-- Enable RLS on project_guests
ALTER TABLE project_guests ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has project access
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_team pt
    JOIN user_org_roles uor ON uor.organization_id = pt.org_id
    WHERE pt.project_id = _project_id
    AND uor.user_id = _user_id
  )
$$;

-- Create security definer function to check project access level
CREATE OR REPLACE FUNCTION public.get_project_access_level(_user_id UUID, _project_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt.access_level 
  FROM project_team pt
  JOIN user_org_roles uor ON uor.organization_id = pt.org_id
  WHERE pt.project_id = _project_id
  AND uor.user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for project_guests
CREATE POLICY "Project team can view guests"
ON project_guests FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project admins can manage guests"
ON project_guests FOR INSERT
WITH CHECK (
  public.get_project_access_level(auth.uid(), project_id) IN ('Owner', 'Admin')
);

CREATE POLICY "Project admins can update guests"
ON project_guests FOR UPDATE
USING (
  public.get_project_access_level(auth.uid(), project_id) IN ('Owner', 'Admin')
);

CREATE POLICY "Project admins can delete guests"
ON project_guests FOR DELETE
USING (
  public.get_project_access_level(auth.uid(), project_id) IN ('Owner', 'Admin')
);

-- Update existing project_team rows to have Owner access for the first org on each project
UPDATE project_team 
SET access_level = 'Owner' 
WHERE id IN (
  SELECT DISTINCT ON (project_id) id 
  FROM project_team 
  ORDER BY project_id, created_at ASC
);