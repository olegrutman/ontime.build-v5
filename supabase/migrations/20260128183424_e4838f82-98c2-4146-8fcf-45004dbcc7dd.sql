
-- Create a new function to check if user can accept project invites
-- This includes PM roles AND Suppliers
CREATE OR REPLACE FUNCTION public.can_accept_project_invite(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_org_roles
        WHERE user_id = _user_id
          AND role IN ('GC_PM', 'TC_PM', 'FC_PM', 'SUPPLIER')
    )
$$;

-- Update the accept_project_invite function to use the new permission check
CREATE OR REPLACE FUNCTION public.accept_project_invite(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
  _user_email text;
  _org_type public.org_type;
  _org_name text;
  _role_label text;
  _invite_id uuid;
  _team_id uuid;
  _updated_team_rows int := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Use the new function that includes Suppliers
  IF NOT public.can_accept_project_invite(_user_id) THEN
    RAISE EXCEPTION 'Only authorized roles can accept invites';
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

  SELECT email
  INTO _user_email
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;

  SELECT type, name
  INTO _org_type, _org_name
  FROM public.organizations
  WHERE id = _user_org_id
  LIMIT 1;

  _role_label := CASE _org_type
    WHEN 'GC' THEN 'General Contractor'
    WHEN 'TC' THEN 'Trade Contractor'
    WHEN 'FC' THEN 'Field Crew'
    WHEN 'SUPPLIER' THEN 'Supplier'
    ELSE NULL
  END;

  -- Prefer the explicit invite -> team linkage
  SELECT pi.id, pi.project_team_id
  INTO _invite_id, _team_id
  FROM public.project_invites pi
  JOIN public.project_team pt ON pt.id = pi.project_team_id
  WHERE pi.project_id = _project_id
    AND pi.status = 'Invited'
    AND (
      pt.org_id = _user_org_id
      OR pt.user_id = _user_id
      OR (pt.org_id IS NULL AND _user_email IS NOT NULL AND pi.invited_email = _user_email)
      OR (pt.org_id IS NULL AND _org_name IS NOT NULL AND pt.invited_org_name = _org_name)
      OR (pt.org_id IS NULL AND _role_label IS NOT NULL AND pt.role = _role_label)
    )
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF _invite_id IS NULL OR _team_id IS NULL THEN
    -- Fallback: locate a team row (legacy cases)
    SELECT pt.id
    INTO _team_id
    FROM public.project_team pt
    WHERE pt.project_id = _project_id
      AND pt.status = 'Invited'
      AND (
        pt.org_id = _user_org_id
        OR pt.user_id = _user_id
        OR (pt.org_id IS NULL AND _org_name IS NOT NULL AND pt.invited_org_name = _org_name)
        OR (pt.org_id IS NULL AND _role_label IS NOT NULL AND pt.role = _role_label)
      )
    ORDER BY pt.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF _team_id IS NULL THEN
    RAISE EXCEPTION 'No matching team invite found for this project';
  END IF;

  -- 1) Mark the invite accepted (if we found one)
  IF _invite_id IS NOT NULL THEN
    UPDATE public.project_invites
    SET status = 'Accepted',
        accepted_at = now()
    WHERE id = _invite_id;
  END IF;

  -- 2) Flip the EXISTING project_team row (SOURCE OF TRUTH)
  UPDATE public.project_team
  SET
    status = 'Accepted',
    accepted_at = now(),
    org_id = COALESCE(org_id, _user_org_id),
    user_id = COALESCE(user_id, _user_id)
  WHERE id = _team_id
    AND status = 'Invited';

  GET DIAGNOSTICS _updated_team_rows = ROW_COUNT;

  IF _updated_team_rows = 0 THEN
    RAISE EXCEPTION 'Team invite could not be accepted (already accepted or not invited)';
  END IF;

  -- 3) Keep project_participants in sync for permissions/legacy reads
  UPDATE public.project_participants
  SET invite_status = 'ACCEPTED',
      accepted_at = now()
  WHERE project_id = _project_id
    AND organization_id = _user_org_id
    AND invite_status = 'INVITED';

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

END;
$function$;

-- Also update decline_project_invite to use the same permission check
CREATE OR REPLACE FUNCTION public.decline_project_invite(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
  _user_email text;
  _org_type public.org_type;
  _org_name text;
  _role_label text;
  _invite_id uuid;
  _team_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Use the new function that includes Suppliers
  IF NOT public.can_accept_project_invite(_user_id) THEN
    RAISE EXCEPTION 'Only authorized roles can decline invites';
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

  SELECT email INTO _user_email FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  SELECT type, name INTO _org_type, _org_name FROM public.organizations WHERE id = _user_org_id LIMIT 1;

  _role_label := CASE _org_type
    WHEN 'GC' THEN 'General Contractor'
    WHEN 'TC' THEN 'Trade Contractor'
    WHEN 'FC' THEN 'Field Crew'
    WHEN 'SUPPLIER' THEN 'Supplier'
    ELSE NULL
  END;

  -- Find matching invite
  SELECT pi.id, pi.project_team_id
  INTO _invite_id, _team_id
  FROM public.project_invites pi
  JOIN public.project_team pt ON pt.id = pi.project_team_id
  WHERE pi.project_id = _project_id
    AND pi.status = 'Invited'
    AND (
      pt.org_id = _user_org_id
      OR pt.user_id = _user_id
      OR (pt.org_id IS NULL AND _user_email IS NOT NULL AND pi.invited_email = _user_email)
      OR (pt.org_id IS NULL AND _org_name IS NOT NULL AND pt.invited_org_name = _org_name)
      OR (pt.org_id IS NULL AND _role_label IS NOT NULL AND pt.role = _role_label)
    )
  ORDER BY pi.created_at DESC
  LIMIT 1;

  IF _invite_id IS NULL OR _team_id IS NULL THEN
    SELECT pt.id INTO _team_id
    FROM public.project_team pt
    WHERE pt.project_id = _project_id
      AND pt.status = 'Invited'
      AND (
        pt.org_id = _user_org_id
        OR pt.user_id = _user_id
        OR (pt.org_id IS NULL AND _org_name IS NOT NULL AND pt.invited_org_name = _org_name)
        OR (pt.org_id IS NULL AND _role_label IS NOT NULL AND pt.role = _role_label)
      )
    ORDER BY pt.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF _team_id IS NULL THEN
    RAISE EXCEPTION 'No matching team invite found for this project';
  END IF;

  -- Mark invite as declined
  IF _invite_id IS NOT NULL THEN
    UPDATE public.project_invites
    SET status = 'Declined'
    WHERE id = _invite_id;
  END IF;

  -- Update team status
  UPDATE public.project_team
  SET status = 'Declined'
  WHERE id = _team_id
    AND status = 'Invited';

  -- Update participants
  UPDATE public.project_participants
  SET invite_status = 'DECLINED'
  WHERE project_id = _project_id
    AND organization_id = _user_org_id
    AND invite_status = 'INVITED';
END;
$function$;
