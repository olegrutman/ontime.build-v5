
-- New consolidated signup RPC: handles org creation + invite auto-detection atomically
CREATE OR REPLACE FUNCTION public.complete_signup(
  _first_name text,
  _last_name text,
  _user_phone text DEFAULT NULL,
  _org_name text DEFAULT NULL,
  _org_type org_type DEFAULT NULL,
  _org_phone text DEFAULT NULL,
  _org_address jsonb DEFAULT NULL,
  _trade text DEFAULT NULL,
  _trade_custom text DEFAULT NULL,
  _job_title text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_email text;
  _org_id uuid;
  _org_code text;
  _role app_role;
  _existing_org_id uuid;
  _addr_street text;
  _addr_city text;
  _addr_state text;
  _addr_zip text;
  _pending_invite record;
  _join_mode text := 'new_org';
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent double-setup
  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Get email from profiles (populated by handle_new_user trigger)
  SELECT email INTO _user_email FROM profiles WHERE user_id = _user_id;
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user';
  END IF;

  -- Step 1: Update profile with name, phone, job_title
  UPDATE profiles
  SET first_name = _first_name,
      last_name = _last_name,
      full_name = trim(_first_name || ' ' || COALESCE(_last_name, '')),
      phone = _user_phone,
      job_title = _job_title,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Step 2: Check for pending org invitations for this email
  SELECT oi.id, oi.organization_id, oi.role
  INTO _pending_invite
  FROM org_invitations oi
  WHERE lower(oi.email) = lower(_user_email)
    AND oi.status = 'pending'
    AND oi.expires_at > now()
  ORDER BY oi.created_at DESC
  LIMIT 1;

  IF _pending_invite IS NOT NULL THEN
    -- Accept the invitation: join existing org
    _join_mode := 'invite_accepted';
    _org_id := _pending_invite.organization_id;
    _role := _pending_invite.role;

    INSERT INTO user_org_roles (user_id, organization_id, role)
    VALUES (_user_id, _org_id, _role)
    ON CONFLICT DO NOTHING;

    UPDATE org_invitations
    SET status = 'accepted'
    WHERE id = _pending_invite.id;

    SELECT org_code INTO _org_code FROM organizations WHERE id = _org_id;
  ELSE
    -- Create new organization (requires org params)
    IF _org_name IS NULL OR _org_type IS NULL THEN
      RAISE EXCEPTION 'Organization name and type are required when no invitation exists';
    END IF;

    _join_mode := 'new_org';

    -- Extract address
    _addr_street := COALESCE(_org_address->>'street', '');
    _addr_city := COALESCE(_org_address->>'city', '');
    _addr_state := COALESCE(_org_address->>'state', '');
    _addr_zip := COALESCE(_org_address->>'zip', '');

    -- Check for existing org (dedup)
    SELECT id INTO _existing_org_id
    FROM organizations
    WHERE lower(trim(name)) = lower(trim(_org_name))
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

      INSERT INTO organizations (org_code, name, type, address, phone, created_by, trade, trade_custom)
      VALUES (_org_code, _org_name, _org_type, _org_address, _org_phone, _user_id,
              CASE WHEN _org_type IN ('TC', 'FC') THEN _trade ELSE NULL END,
              CASE WHEN _org_type IN ('TC', 'FC') AND _trade = 'Other' THEN _trade_custom ELSE NULL END)
      RETURNING id INTO _org_id;
    END IF;

    -- Assign role based on org type
    CASE _org_type
      WHEN 'GC' THEN _role := 'GC_PM';
      WHEN 'TC' THEN _role := 'TC_PM';
      WHEN 'FC' THEN _role := 'FC_PM';
      WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
    END CASE;

    INSERT INTO user_org_roles (user_id, organization_id, role)
    VALUES (_user_id, _org_id, _role);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'join_mode', _join_mode,
    'role', _role::text
  );
END;
$$;
