-- Add FC_PM to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'FC_PM';

-- Update the create_organization_and_set_admin function to assign FC_PM for FC orgs
CREATE OR REPLACE FUNCTION public.create_organization_and_set_admin(
  _org_type org_type,
  _org_name text,
  _address jsonb,
  _org_phone text,
  _user_first_name text,
  _user_last_name text,
  _user_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _org_code text;
  _profile profiles;
  _role app_role;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already belongs to an org
  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Generate unique org code from name
  _org_code := upper(regexp_replace(substring(_org_name, 1, 10), '[^A-Za-z0-9]', '', 'g'));
  
  -- Add random suffix if code exists
  WHILE EXISTS (SELECT 1 FROM organizations WHERE org_code = _org_code) LOOP
    _org_code := _org_code || floor(random() * 1000)::text;
  END LOOP;

  -- Create organization
  INSERT INTO organizations (org_code, name, type, address, phone, created_by)
  VALUES (_org_code, _org_name, _org_type, _address, _org_phone, _user_id)
  RETURNING id INTO _org_id;

  -- Determine role based on org type
  -- FC now gets its own FC_PM role instead of TC_PM
  CASE _org_type
    WHEN 'GC' THEN _role := 'GC_PM';
    WHEN 'TC' THEN _role := 'TC_PM';
    WHEN 'FC' THEN _role := 'FC_PM';
    WHEN 'SUPPLIER' THEN _role := 'SUPPLIER';
  END CASE;

  -- Create or update profile
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

  -- Assign user to org with appropriate PM role
  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (_user_id, _org_id, _role);

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code
  );
END;
$$;