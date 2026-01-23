
-- Create function to accept invite
CREATE OR REPLACE FUNCTION public.accept_project_invite_v2(
  _token TEXT,
  _user_id UUID,
  _org_id UUID DEFAULT NULL,
  _org_name TEXT DEFAULT NULL,
  _org_address JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite project_invites%ROWTYPE;
  _new_org_id UUID;
  _project_name TEXT;
BEGIN
  SELECT * INTO _invite FROM project_invites WHERE token = _token AND status = 'Invited';
  
  IF _invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  IF _invite.expires_at < now() THEN
    UPDATE project_invites SET status = 'Expired' WHERE id = _invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;
  
  IF _org_id IS NULL AND _org_name IS NOT NULL THEN
    INSERT INTO organizations (name, type, address, created_by)
    VALUES (
      _org_name,
      CASE _invite.role 
        WHEN 'General Contractor' THEN 'GC'
        WHEN 'Trade Contractor' THEN 'TC'
        WHEN 'Field Crew' THEN 'FC'
        ELSE 'SUPPLIER'
      END,
      _org_address,
      _user_id
    )
    RETURNING id INTO _new_org_id;
    
    INSERT INTO user_org_roles (user_id, organization_id, role)
    VALUES (
      _user_id, 
      _new_org_id, 
      CASE _invite.role 
        WHEN 'General Contractor' THEN 'GC_PM'
        WHEN 'Trade Contractor' THEN 'TC_PM'
        WHEN 'Field Crew' THEN 'FS'
        ELSE 'SUPPLIER'
      END
    );
  ELSE
    _new_org_id := _org_id;
  END IF;
  
  UPDATE project_invites SET status = 'Accepted', accepted_at = now() WHERE id = _invite.id;
  
  UPDATE project_team 
  SET status = 'Accepted', accepted_at = now(), org_id = COALESCE(_new_org_id, org_id), user_id = _user_id
  WHERE id = _invite.project_team_id;
  
  INSERT INTO project_participants (project_id, organization_id, role, invite_status)
  VALUES (
    _invite.project_id,
    _new_org_id,
    CASE _invite.role 
      WHEN 'General Contractor' THEN 'GC'
      WHEN 'Trade Contractor' THEN 'TC'
      WHEN 'Field Crew' THEN 'FC'
      ELSE 'SUPPLIER'
    END,
    'ACCEPTED'
  )
  ON CONFLICT (project_id, organization_id) DO UPDATE SET invite_status = 'ACCEPTED';
  
  SELECT name INTO _project_name FROM projects WHERE id = _invite.project_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'project_id', _invite.project_id,
    'project_name', _project_name,
    'org_id', _new_org_id
  );
END;
$$;

-- Create function to get invite details by token
CREATE OR REPLACE FUNCTION public.get_invite_by_token_v2(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite project_invites%ROWTYPE;
  _project projects%ROWTYPE;
  _inviter_name TEXT;
BEGIN
  SELECT * INTO _invite FROM project_invites WHERE token = _token;
  
  IF _invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  IF _invite.status != 'Invited' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already ' || _invite.status);
  END IF;
  
  IF _invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;
  
  SELECT * INTO _project FROM projects WHERE id = _invite.project_id;
  SELECT full_name INTO _inviter_name FROM profiles WHERE id = _invite.invited_by_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'invite', jsonb_build_object(
      'id', _invite.id,
      'role', _invite.role,
      'trade', _invite.trade,
      'invited_email', _invite.invited_email,
      'invited_name', _invite.invited_name,
      'invited_org_name', _invite.invited_org_name
    ),
    'project', jsonb_build_object(
      'id', _project.id,
      'name', _project.name,
      'address', _project.address,
      'city', _project.city,
      'state', _project.state
    ),
    'inviter_name', _inviter_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_project_invite_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token_v2 TO anon, authenticated;
