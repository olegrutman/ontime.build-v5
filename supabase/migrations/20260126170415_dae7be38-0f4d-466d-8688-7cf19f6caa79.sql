-- Fix accept_project_invite to reliably flip the existing project_team row to Accepted (source of truth)
-- and ensure project_participants is updated/created for permissions.

CREATE OR REPLACE FUNCTION public.accept_project_invite(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
  _user_email text;
  _team_rows int := 0;
  _org_type public.org_type;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id
  INTO _user_org_id
  FROM public.user_org_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF _user_org_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to an organization';
  END IF;

  IF NOT public.is_pm_role(_user_id) THEN
    RAISE EXCEPTION 'Only PM roles can accept invites';
  END IF;

  SELECT email
  INTO _user_email
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;

  SELECT type
  INTO _org_type
  FROM public.organizations
  WHERE id = _user_org_id
  LIMIT 1;

  -- 1) Update the existing project_team row (SOURCE OF TRUTH)
  UPDATE public.project_team
  SET
    status = 'Accepted',
    accepted_at = now(),
    org_id = COALESCE(org_id, _user_org_id),
    user_id = COALESCE(user_id, _user_id)
  WHERE project_id = _project_id
    AND status = 'Invited'
    AND (
      org_id = _user_org_id
      OR (_user_email IS NOT NULL AND invited_email = _user_email)
      OR user_id = _user_id
    );

  GET DIAGNOSTICS _team_rows = ROW_COUNT;

  -- 2) Update participant invite status (kept for permissions/legacy)
  UPDATE public.project_participants
  SET invite_status = 'ACCEPTED',
      accepted_at = now()
  WHERE project_id = _project_id
    AND organization_id = _user_org_id
    AND invite_status = 'INVITED';

  -- Ensure a participant row exists (in case the invite was created only in project_team)
  INSERT INTO public.project_participants (
    project_id,
    organization_id,
    role,
    invite_status,
    invited_by,
    invited_at,
    accepted_at
  )
  SELECT
    _project_id,
    _user_org_id,
    _org_type,
    'ACCEPTED',
    _user_id,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.project_participants pp
    WHERE pp.project_id = _project_id
      AND pp.organization_id = _user_org_id
  );

  IF _team_rows = 0 THEN
    RAISE EXCEPTION 'No matching team invite found for this project';
  END IF;
END;
$$;