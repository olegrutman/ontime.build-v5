
-- 1. Fix existing record for owner@ontime.build
UPDATE user_org_roles SET is_admin = true
WHERE user_id = 'bd196a35-e30f-4a42-8c5c-d310be318ec3'
  AND organization_id = '4f47c536-01b4-4979-b968-c2ba627e302a';

-- 2. Update complete_signup RPC to set is_admin = true for org creators
CREATE OR REPLACE FUNCTION public.complete_signup(
  _first_name text,
  _last_name text,
  _phone text DEFAULT NULL,
  _org_name text DEFAULT NULL,
  _org_type public.org_type DEFAULT NULL,
  _trade text DEFAULT NULL,
  _trade_custom text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text;
  _org_id uuid;
  _org_code text;
  _role public.app_role;
  _invite record;
  _join_mode text := 'new_org';
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;

  -- Upsert profile
  INSERT INTO profiles (user_id, email, first_name, last_name, full_name, phone)
  VALUES (_user_id, _email, _first_name, _last_name, _first_name || ' ' || _last_name, _phone)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = now();

  -- Check for pending invitation
  SELECT * INTO _invite
  FROM org_invitations
  WHERE email = _email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invite IS NOT NULL THEN
    -- Accept invitation path
    _join_mode := 'invite_accepted';
    _org_id := _invite.organization_id;
    _role := _invite.role;

    UPDATE org_invitations SET status = 'accepted' WHERE id = _invite.id;

    INSERT INTO user_org_roles (user_id, organization_id, role)
    VALUES (_user_id, _org_id, _role);
  ELSE
    -- Create new org path
    IF _org_name IS NULL OR _org_type IS NULL THEN
      RAISE EXCEPTION 'Organization name and type are required';
    END IF;

    _org_code := substr(md5(random()::text), 1, 8);

    INSERT INTO organizations (name, type, org_code, created_by, trade, trade_custom)
    VALUES (_org_name, _org_type, _org_code, _user_id, _trade, _trade_custom)
    RETURNING id INTO _org_id;

    -- Create org_settings row
    INSERT INTO org_settings (organization_id) VALUES (_org_id);

    -- Assign role based on org type
    CASE _org_type
      WHEN 'GC' THEN _role := 'GC_PM';
      WHEN 'TC' THEN _role := 'TC_PM';
      WHEN 'FC' THEN _role := 'FC_PM';
      WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
    END CASE;

    INSERT INTO user_org_roles (user_id, organization_id, role, is_admin)
    VALUES (_user_id, _org_id, _role, true);
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
