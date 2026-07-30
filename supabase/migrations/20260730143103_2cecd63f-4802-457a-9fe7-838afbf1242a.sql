-- Step 4: seed creator into project_members on project insert
create or replace function public.seed_project_creator()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into project_members (project_id, user_id, organization_id, added_by)
  select new.id, auth.uid(), new.organization_id, auth.uid()
  where auth.uid() is not null
  on conflict do nothing;
  return new;
end; $$;

drop trigger if exists projects_seed_creator on public.projects;
create trigger projects_seed_creator
  after insert on public.projects
  for each row execute function public.seed_project_creator();

-- Step 5: last-admin guard
create or replace function public.guard_last_admin()
returns trigger language plpgsql security definer
set search_path = public as $$
declare v_remaining int;
begin
  select count(*) into v_remaining from user_org_roles
  where organization_id = coalesce(old.organization_id, new.organization_id)
    and is_admin = true and id <> old.id;
  if v_remaining = 0 then
    raise exception 'Cannot remove or demote the last admin of this organization. Promote another admin first.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end; $$;

drop trigger if exists uor_guard_admin_delete on public.user_org_roles;
create trigger uor_guard_admin_delete
  before delete on public.user_org_roles
  for each row when (old.is_admin = true)
  execute function public.guard_last_admin();

drop trigger if exists uor_guard_admin_update on public.user_org_roles;
create trigger uor_guard_admin_update
  before update on public.user_org_roles
  for each row when (old.is_admin = true and new.is_admin = false)
  execute function public.guard_last_admin();

-- Step 4b: stamp project_scope from the org default on membership creation
CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_invitation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT;
  v_org_id UUID;
  v_role app_role;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_caller_email TEXT;
  v_scope TEXT;
BEGIN
  SELECT email INTO v_caller_email
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email, organization_id, role, status, expires_at
  INTO v_email, v_org_id, v_role, v_status, v_expires_at
  FROM org_invitations
  WHERE id = p_invitation_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF lower(v_caller_email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  SELECT COALESCE(default_project_scope, 'org') INTO v_scope
  FROM organizations WHERE id = v_org_id;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (auth.uid(), v_org_id, v_role, COALESCE(v_scope, 'org'))
  ON CONFLICT DO NOTHING;

  UPDATE org_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id UUID := auth.uid();
  _req org_join_requests;
  _org_type org_type;
  _role app_role;
  _scope TEXT;
BEGIN
  SELECT * INTO _req FROM org_join_requests WHERE id = _request_id AND status = 'pending';
  IF _req.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = _caller_id
    AND organization_id = _req.organization_id
    AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve join requests';
  END IF;

  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _req.user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  SELECT type, COALESCE(default_project_scope, 'org')
  INTO _org_type, _scope
  FROM organizations WHERE id = _req.organization_id;

  _role := CASE _org_type
    WHEN 'GC' THEN 'GC_PM'::app_role
    WHEN 'TC' THEN 'FS'::app_role
    WHEN 'FC' THEN 'FS'::app_role
    WHEN 'SUPPLIER' THEN 'SUPPLIER'::app_role
  END;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (_req.user_id, _req.organization_id, _role, COALESCE(_scope, 'org'));

  IF _req.job_title IS NOT NULL THEN
    UPDATE profiles SET job_title = _req.job_title WHERE user_id = _req.user_id;
  END IF;

  UPDATE org_join_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = _caller_id
  WHERE id = _request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(_org_name text, _org_type org_type, _org_phone text DEFAULT NULL::text, _address jsonb DEFAULT NULL::jsonb, _user_first_name text DEFAULT NULL::text, _user_last_name text DEFAULT NULL::text, _user_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _org_code text;
  _role app_role;
  _existing_org_id uuid;
  _addr_street text;
  _addr_city text;
  _addr_state text;
  _addr_zip text;
  _user_email text;
  _scope text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  SELECT email INTO _user_email FROM profiles WHERE user_id = _user_id;
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  _addr_street := COALESCE(_address->>'street', '');
  _addr_city := COALESCE(_address->>'city', '');
  _addr_state := COALESCE(_address->>'state', '');
  _addr_zip := COALESCE(_address->>'zip', '');

  SELECT id INTO _existing_org_id
  FROM organizations
  WHERE 
    lower(trim(name)) = lower(trim(_org_name))
    AND lower(trim(COALESCE(address->>'street', ''))) = lower(trim(_addr_street))
    AND lower(trim(COALESCE(address->>'city', ''))) = lower(trim(_addr_city))
    AND lower(trim(COALESCE(address->>'state', ''))) = lower(trim(_addr_state))
    AND trim(COALESCE(address->>'zip', '')) = trim(_addr_zip)
    AND normalize_phone(phone) = normalize_phone(_org_phone)
  LIMIT 1;

  IF _existing_org_id IS NOT NULL THEN
    _org_id := _existing_org_id;
    SELECT org_code INTO _org_code FROM organizations WHERE id = _org_id;
  ELSE
    _org_code := upper(regexp_replace(substring(_org_name, 1, 10), '[^A-Za-z0-9]', '', 'g'));
    WHILE EXISTS (SELECT 1 FROM organizations WHERE org_code = _org_code) LOOP
      _org_code := _org_code || floor(random() * 1000)::text;
    END LOOP;

    INSERT INTO organizations (org_code, name, type, address, phone, created_by)
    VALUES (_org_code, _org_name, _org_type, _address, _org_phone, _user_id)
    RETURNING id INTO _org_id;
  END IF;

  CASE _org_type
    WHEN 'GC' THEN _role := 'GC_PM';
    WHEN 'TC' THEN _role := 'TC_PM';
    WHEN 'FC' THEN _role := 'FC_PM';
    WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
  END CASE;

  UPDATE profiles
  SET first_name = _user_first_name,
      last_name = _user_last_name,
      phone = _user_phone,
      full_name = _user_first_name || ' ' || _user_last_name,
      updated_at = now()
  WHERE user_id = _user_id;

  SELECT COALESCE(default_project_scope, 'org') INTO _scope
  FROM organizations WHERE id = _org_id;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (_user_id, _org_id, _role, COALESCE(_scope, 'org'));

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'is_existing_org', _existing_org_id IS NOT NULL
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(_org_type org_type, _org_name text, _address jsonb, _org_phone text, _user_first_name text, _user_last_name text, _user_phone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _org_code text;
  _role app_role;
  _existing_org_id uuid;
  _addr_street text;
  _addr_city text;
  _addr_state text;
  _addr_zip text;
  _scope text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  _addr_street := COALESCE(_address->>'street', '');
  _addr_city := COALESCE(_address->>'city', '');
  _addr_state := COALESCE(_address->>'state', '');
  _addr_zip := COALESCE(_address->>'zip', '');

  SELECT id INTO _existing_org_id
  FROM organizations
  WHERE 
    lower(trim(name)) = lower(trim(_org_name))
    AND lower(trim(COALESCE(address->>'street', ''))) = lower(trim(_addr_street))
    AND lower(trim(COALESCE(address->>'city', ''))) = lower(trim(_addr_city))
    AND lower(trim(COALESCE(address->>'state', ''))) = lower(trim(_addr_state))
    AND trim(COALESCE(address->>'zip', '')) = trim(_addr_zip)
    AND normalize_phone(phone) = normalize_phone(_org_phone)
  LIMIT 1;

  IF _existing_org_id IS NOT NULL THEN
    _org_id := _existing_org_id;
    SELECT org_code INTO _org_code FROM organizations WHERE id = _org_id;
  ELSE
    _org_code := upper(regexp_replace(substring(_org_name, 1, 10), '[^A-Za-z0-9]', '', 'g'));
    WHILE EXISTS (SELECT 1 FROM organizations WHERE org_code = _org_code) LOOP
      _org_code := _org_code || floor(random() * 1000)::text;
    END LOOP;

    INSERT INTO organizations (org_code, name, type, address, phone, created_by)
    VALUES (_org_code, _org_name, _org_type, _address, _org_phone, _user_id)
    RETURNING id INTO _org_id;
  END IF;

  CASE _org_type
    WHEN 'GC' THEN _role := 'GC_PM';
    WHEN 'TC' THEN _role := 'TC_PM';
    WHEN 'FC' THEN _role := 'FC_PM';
    WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
  END CASE;

  INSERT INTO profiles (user_id, email, first_name, last_name, phone, full_name)
  SELECT _user_id, email, _user_first_name, _user_last_name, _user_phone, 
         _user_first_name || ' ' || _user_last_name
  FROM auth.users WHERE id = _user_id
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  SELECT COALESCE(default_project_scope, 'org') INTO _scope
  FROM organizations WHERE id = _org_id;

  INSERT INTO user_org_roles (user_id, organization_id, role, project_scope)
  VALUES (_user_id, _org_id, _role, COALESCE(_scope, 'org'));

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'is_existing_org', _existing_org_id IS NOT NULL
  );
END;
$function$;