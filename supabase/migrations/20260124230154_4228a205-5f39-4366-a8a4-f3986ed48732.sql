-- Update project status check constraint to include 'archived' and 'on_hold' and 'completed'
-- First check if constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'projects_status_check' 
             AND table_name = 'projects') THEN
    ALTER TABLE projects DROP CONSTRAINT projects_status_check;
  END IF;
END $$;

-- Add new constraint with all valid statuses
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'on_hold'::text, 'completed'::text, 'archived'::text]));