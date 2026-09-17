-- Allow org admins / team managers to control which projects a member can see

CREATE OR REPLACE FUNCTION public.can_manage_project_access(_org_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_org_roles r
    LEFT JOIN public.member_permissions mp ON mp.user_org_role_id = r.id
    WHERE r.user_id = _user_id
      AND r.organization_id = _org_id
      AND (r.is_admin OR COALESCE(mp.can_manage_team, false))
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_project_access(uuid, uuid) TO authenticated, service_role;

-- Set a member's project visibility: 'org' (all company projects) or 'assigned'
CREATE OR REPLACE FUNCTION public.set_member_project_scope(_target_role_id uuid, _scope text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_is_admin boolean;
  v_user uuid;
  v_owner uuid;
BEGIN
  IF _scope NOT IN ('org', 'assigned') THEN
    RAISE EXCEPTION 'Invalid scope';
  END IF;

  SELECT r.organization_id, r.is_admin, r.user_id
    INTO v_org, v_is_admin, v_user
  FROM public.user_org_roles r
  WHERE r.id = _target_role_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.can_manage_project_access(v_org) THEN
    RAISE EXCEPTION 'Not authorized to change project access';
  END IF;

  SELECT o.created_by INTO v_owner FROM public.organizations o WHERE o.id = v_org;

  IF _scope = 'assigned' AND (v_is_admin OR v_user = v_owner) THEN
    RAISE EXCEPTION 'Company admins always have access to every project';
  END IF;

  UPDATE public.user_org_roles SET project_scope = _scope WHERE id = _target_role_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_project_scope(uuid, text) TO authenticated, service_role;

-- Assign / unassign one of your own company's members to a project
CREATE OR REPLACE FUNCTION public.set_project_member_access(_project_id uuid, _user_id uuid, _active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_org_has_project boolean;
BEGIN
  SELECT r.organization_id INTO v_org
  FROM public.user_org_roles r
  WHERE r.user_id = _user_id
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.can_manage_project_access(v_org) THEN
    RAISE EXCEPTION 'Not authorized to change project access';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (p.organization_id = v_org
           OR EXISTS (SELECT 1 FROM public.project_participants pp
                      WHERE pp.project_id = p.id AND pp.organization_id = v_org))
  ) INTO v_org_has_project;

  IF NOT v_org_has_project THEN
    RAISE EXCEPTION 'Your company is not on this project';
  END IF;

  IF _active THEN
    INSERT INTO public.project_members (project_id, user_id, organization_id, status, added_by)
    VALUES (_project_id, _user_id, v_org, 'active', auth.uid())
    ON CONFLICT (project_id, user_id) DO UPDATE SET status = 'active';
  ELSE
    UPDATE public.project_members
      SET status = 'removed'
      WHERE project_id = _project_id AND user_id = _user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_project_member_access(uuid, uuid, boolean) TO authenticated, service_role;