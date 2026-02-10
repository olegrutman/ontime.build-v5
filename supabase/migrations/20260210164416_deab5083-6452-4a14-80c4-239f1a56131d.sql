
-- Fix: Replace auth.users references with public.profiles in three functions

-- 1. create_organization_and_set_admin: change the profile upsert to read email from profiles
CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(
  _org_name text,
  _org_type org_type,
  _org_phone text DEFAULT NULL,
  _address jsonb DEFAULT NULL,
  _user_first_name text DEFAULT NULL,
  _user_last_name text DEFAULT NULL,
  _user_phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already belongs to an org
  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Get email from profiles (populated by handle_new_user trigger)
  SELECT email INTO _user_email FROM profiles WHERE user_id = _user_id;
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Extract address components
  _addr_street := COALESCE(_address->>'street', '');
  _addr_city := COALESCE(_address->>'city', '');
  _addr_state := COALESCE(_address->>'state', '');
  _addr_zip := COALESCE(_address->>'zip', '');

  -- Check for existing organization with same name+address+phone
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

  -- Update profile with name/phone (email already exists from trigger)
  UPDATE profiles
  SET first_name = _user_first_name,
      last_name = _user_last_name,
      phone = _user_phone,
      full_name = _user_first_name || ' ' || _user_last_name,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Assign user to org with appropriate PM role
  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (_user_id, _org_id, _role);

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'is_existing_org', _existing_org_id IS NOT NULL
  );
END;
$$;

-- 2. accept_org_invitation: read caller email from profiles
CREATE OR REPLACE FUNCTION public.accept_org_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_org_id UUID;
  v_role app_role;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_caller_email TEXT;
BEGIN
  -- Get caller's email from profiles
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

  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (auth.uid(), v_org_id, v_role)
  ON CONFLICT DO NOTHING;

  UPDATE org_invitations
  SET status = 'accepted'
  WHERE id = p_invitation_id;
END;
$$;

-- 3. decline_org_invitation: read caller email from profiles
CREATE OR REPLACE FUNCTION public.decline_org_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_caller_email TEXT;
BEGIN
  SELECT email INTO v_caller_email
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email
  FROM org_invitations
  WHERE id = p_invitation_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF lower(v_caller_email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;

  UPDATE org_invitations
  SET status = 'expired'
  WHERE id = p_invitation_id
    AND status = 'pending';
END;
$$;
