-- Create accept_project_invite RPC for accepting invites from project_participants
CREATE OR REPLACE FUNCTION public.accept_project_invite(_project_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
BEGIN
  -- Get user's org
  SELECT organization_id INTO _user_org_id 
  FROM user_org_roles 
  WHERE user_id = _user_id 
  LIMIT 1;
  
  IF _user_org_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to an organization';
  END IF;
  
  -- Check if user has PM role (can accept invites)
  IF NOT is_pm_role(_user_id) THEN
    RAISE EXCEPTION 'Only PM roles can accept invites';
  END IF;
  
  -- Update the project_participants record
  UPDATE project_participants
  SET 
    invite_status = 'ACCEPTED',
    accepted_at = now()
  WHERE project_id = _project_id 
    AND organization_id = _user_org_id
    AND invite_status = 'INVITED';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending invite found for this project';
  END IF;
  
  -- Also update project_team if exists
  UPDATE project_team
  SET 
    status = 'Accepted',
    accepted_at = now()
  WHERE project_id = _project_id 
    AND org_id = _user_org_id
    AND status = 'Invited';
END;
$$;