-- Add access_level column to project_team for granular project permissions
ALTER TABLE project_team 
ADD COLUMN access_level TEXT DEFAULT 'Editor' 
CHECK (access_level IN ('Owner', 'Admin', 'Editor', 'Viewer'));

-- Add view_preference to profiles for remembering user's preferred view mode
ALTER TABLE profiles 
ADD COLUMN view_preference TEXT DEFAULT 'list' 
CHECK (view_preference IN ('list', 'board', 'table'));