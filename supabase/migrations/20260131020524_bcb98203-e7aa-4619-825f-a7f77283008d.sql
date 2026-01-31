-- Create trigger function to sync project_team inserts to project_participants
-- This ensures notifications are sent when any accepted participant invites another org
CREATE OR REPLACE FUNCTION public.sync_project_team_to_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role_type org_type;
BEGIN
  -- Only sync when we have an org_id and status is Invited
  IF NEW.org_id IS NOT NULL AND NEW.status = 'Invited' THEN
    -- Map role string to org_type enum
    _role_type := CASE NEW.role
      WHEN 'General Contractor' THEN 'GC'::org_type
      WHEN 'Trade Contractor' THEN 'TC'::org_type
      WHEN 'Field Crew' THEN 'FC'::org_type
      WHEN 'Supplier' THEN 'SUPPLIER'::org_type
      ELSE 'TC'::org_type
    END;
    
    -- Upsert into project_participants
    -- This will trigger the notify_project_invite trigger which creates the notification
    INSERT INTO project_participants (
      project_id,
      organization_id,
      role,
      invite_status,
      invited_by
    ) VALUES (
      NEW.project_id,
      NEW.org_id,
      _role_type,
      'INVITED',
      NEW.invited_by_user_id
    )
    ON CONFLICT (project_id, organization_id) 
    DO UPDATE SET
      invite_status = 'INVITED',
      invited_by = NEW.invited_by_user_id,
      accepted_at = NULL
    WHERE project_participants.invite_status != 'ACCEPTED';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on project_team
DROP TRIGGER IF EXISTS trg_sync_team_to_participants ON public.project_team;
CREATE TRIGGER trg_sync_team_to_participants
  AFTER INSERT ON public.project_team
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_team_to_participants();