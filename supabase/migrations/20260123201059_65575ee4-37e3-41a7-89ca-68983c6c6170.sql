-- Create project_activity table for logging project events
CREATE TABLE public.project_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  actor_company TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_project_activity_project_id ON public.project_activity(project_id);
CREATE INDEX idx_project_activity_created_at ON public.project_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Project participants can view activity
CREATE POLICY "Project participants can view activity"
ON public.project_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_participants pp
    WHERE pp.project_id = project_activity.project_id
    AND user_in_org(auth.uid(), pp.organization_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_activity.project_id
    AND user_in_org(auth.uid(), p.organization_id)
  )
);

-- Policy: System can insert activity (via functions/triggers)
CREATE POLICY "Authenticated users can insert activity for their projects"
ON public.project_activity
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM project_participants pp
      WHERE pp.project_id = project_activity.project_id
      AND user_in_org(auth.uid(), pp.organization_id)
    )
    OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_activity.project_id
      AND user_in_org(auth.uid(), p.organization_id)
    )
  )
);

-- Add status column to project_team if it doesn't exist (for invite tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_team' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.project_team ADD COLUMN status TEXT NOT NULL DEFAULT 'Invited';
  END IF;
END $$;

-- Enable realtime for project_activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity;