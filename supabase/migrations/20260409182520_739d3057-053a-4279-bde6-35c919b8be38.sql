
CREATE OR REPLACE FUNCTION public.resend_project_invite(_project_id uuid, _team_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tm record;
  v_resolved_user_id uuid;
  v_resolved_org_id uuid;
  v_participant_created boolean := false;
  v_notification_created boolean := false;
  v_project_name text;
  v_role_map jsonb := '{"General Contractor":"GC","Trade Contractor":"TC","Field Crew":"FC","Supplier":"SUPPLIER"}'::jsonb;
  v_participant_role text;
  v_org_member record;
BEGIN
  -- 1. Load project_team row
  SELECT * INTO v_tm
  FROM project_team
  WHERE id = _team_member_id AND project_id = _project_id;

  IF v_tm IS NULL THEN
    RETURN jsonb_build_object('error', 'Team member not found');
  END IF;

  -- 2. If org_id is null and invited_email exists, resolve
  IF v_tm.org_id IS NULL AND v_tm.invited_email IS NOT NULL THEN
    SELECT user_id INTO v_resolved_user_id
    FROM profiles
    WHERE email = v_tm.invited_email;

    IF v_resolved_user_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Invited email does not match a registered account yet');
    END IF;

    SELECT organization_id INTO v_resolved_org_id
    FROM user_org_roles
    WHERE user_id = v_resolved_user_id
    LIMIT 1;

    IF v_resolved_org_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Could not resolve organization for invited user');
    END IF;

    -- Update project_team with resolved IDs
    UPDATE project_team
    SET org_id = v_resolved_org_id, user_id = v_resolved_user_id
    WHERE id = _team_member_id;
  ELSE
    v_resolved_org_id := v_tm.org_id;
    v_resolved_user_id := v_tm.user_id;
  END IF;

  -- 3. Ensure project_participants row exists
  v_participant_role := v_role_map ->> v_tm.role;
  IF v_participant_role IS NULL THEN
    v_participant_role := 'TC';
  END IF;

  IF v_resolved_org_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM project_participants
      WHERE project_id = _project_id AND organization_id = v_resolved_org_id
    ) THEN
      INSERT INTO project_participants (project_id, organization_id, role, invite_status, invited_by)
      VALUES (_project_id, v_resolved_org_id, v_participant_role::participant_role, 'INVITED', auth.uid());
      v_participant_created := true;
    END IF;
  END IF;

  -- 4. Refresh project_invites timestamp
  UPDATE project_invites
  SET created_at = now()
  WHERE project_team_id = _team_member_id;

  -- 5. Create notification for org members
  IF v_resolved_org_id IS NOT NULL THEN
    SELECT name INTO v_project_name FROM projects WHERE id = _project_id;
    IF v_project_name IS NULL THEN v_project_name := 'a project'; END IF;

    FOR v_org_member IN
      SELECT user_id FROM user_org_roles WHERE organization_id = v_resolved_org_id
    LOOP
      INSERT INTO notifications (recipient_org_id, recipient_user_id, type, title, body, entity_type, entity_id, action_url)
      VALUES (
        v_resolved_org_id,
        v_org_member.user_id,
        'PROJECT_INVITE'::notification_type,
        'Project Invitation',
        'You''ve been invited to join "' || v_project_name || '"',
        'project',
        _project_id,
        '/dashboard'
      );
    END LOOP;
    v_notification_created := true;
  END IF;

  RETURN jsonb_build_object(
    'resolved', true,
    'participant_created', v_participant_created,
    'notification_created', v_notification_created
  );
END;
$$;
