CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(
  _org_name text,
  _org_type public.org_type,
  _org_phone text DEFAULT NULL::text,
  _address jsonb DEFAULT NULL::jsonb,
  _user_first_name text DEFAULT NULL::text,
  _user_last_name text DEFAULT NULL::text,
  _user_phone text DEFAULT NULL::text
)
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

  INSERT INTO user_org_roles (user_id, organization_id, role, is_admin, project_scope)
  VALUES (_user_id, _org_id, _role, true, COALESCE(_scope, 'org'));

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code,
    'is_existing_org', _existing_org_id IS NOT NULL
  );
END;
$function$;