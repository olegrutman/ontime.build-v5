-- V1 Simplified Org/User Setup Migration

-- 1) Add address and phone to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS address jsonb NULL,
ADD COLUMN IF NOT EXISTS phone text NULL,
ADD COLUMN IF NOT EXISTS created_by uuid NULL;

-- 2) Add first_name, last_name, phone to profiles (split full_name)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text NULL,
ADD COLUMN IF NOT EXISTS last_name text NULL,
ADD COLUMN IF NOT EXISTS phone text NULL;

-- 3) Create trusted_partners table for privacy-controlled search
CREATE TABLE IF NOT EXISTS public.trusted_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  partner_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, partner_org_id)
);

CREATE INDEX IF NOT EXISTS idx_trusted_partners_org ON public.trusted_partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_trusted_partners_partner ON public.trusted_partners(partner_org_id);

-- Enable RLS on trusted_partners
ALTER TABLE public.trusted_partners ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their org's trusted partners
CREATE POLICY "Users can view own org trusted partners"
ON public.trusted_partners FOR SELECT
TO authenticated
USING (user_in_org(auth.uid(), organization_id));

-- RLS: PMs can manage trusted partners
CREATE POLICY "PMs can manage trusted partners"
ON public.trusted_partners FOR ALL
TO authenticated
USING (user_in_org(auth.uid(), organization_id) AND is_pm_role(auth.uid()))
WITH CHECK (user_in_org(auth.uid(), organization_id) AND is_pm_role(auth.uid()));

-- 4) RPC: Check if user needs org setup (profile exists but no org)
CREATE OR REPLACE FUNCTION public.check_org_setup_needed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _profile profiles;
  _org_role user_org_roles;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Check if user has a profile
  SELECT * INTO _profile FROM profiles WHERE user_id = _user_id;
  
  -- Check if user has any org role
  SELECT * INTO _org_role FROM user_org_roles WHERE user_id = _user_id LIMIT 1;
  
  IF _org_role.id IS NOT NULL THEN
    -- User already has an org
    RETURN jsonb_build_object(
      'needs_org_setup', false,
      'organization_id', _org_role.organization_id
    );
  ELSE
    -- User needs to create/join an org
    RETURN jsonb_build_object(
      'needs_org_setup', true,
      'profile_exists', _profile.id IS NOT NULL
    );
  END IF;
END;
$$;

-- 5) RPC: Create organization and set user as admin
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
  CASE _org_type
    WHEN 'GC' THEN _role := 'GC_PM';
    WHEN 'TC' THEN _role := 'TC_PM';
    WHEN 'FC' THEN _role := 'TC_PM';
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

  -- Assign user to org with PM role (admin)
  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (_user_id, _org_id, _role);

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'org_code', _org_code
  );
END;
$$;

-- 6) RPC: Search for invite targets (people + orgs) with privacy controls
CREATE OR REPLACE FUNCTION public.search_invite_targets(
  _query text,
  _limit int DEFAULT 10
)
RETURNS TABLE (
  result_type text,
  id uuid,
  display_name text,
  organization_name text,
  email text,
  city_state text,
  org_type org_type
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _user_org_id uuid;
  _query_lower text := lower(trim(_query));
BEGIN
  -- Get user's org
  SELECT organization_id INTO _user_org_id 
  FROM user_org_roles WHERE user_id = _user_id LIMIT 1;

  IF _user_org_id IS NULL THEN
    RETURN;
  END IF;

  -- If query looks like an email, return "invite by email" option
  IF _query_lower LIKE '%@%.%' THEN
    RETURN QUERY
    SELECT 
      'email'::text as result_type,
      NULL::uuid as id,
      'Invite by email'::text as display_name,
      NULL::text as organization_name,
      _query::text as email,
      NULL::text as city_state,
      NULL::org_type as org_type;
    RETURN;
  END IF;

  -- Search organizations (broader search)
  RETURN QUERY
  SELECT 
    'organization'::text as result_type,
    o.id,
    o.name as display_name,
    o.name as organization_name,
    NULL::text as email,
    COALESCE(o.address->>'city', '') || ', ' || COALESCE(o.address->>'state', '') as city_state,
    o.type as org_type
  FROM organizations o
  WHERE 
    o.id != _user_org_id
    AND (
      lower(o.name) LIKE '%' || _query_lower || '%'
      OR lower(o.org_code) LIKE '%' || _query_lower || '%'
    )
  LIMIT _limit / 2;

  -- Search people (only in trusted/connected orgs)
  RETURN QUERY
  SELECT 
    'person'::text as result_type,
    p.user_id as id,
    COALESCE(p.last_name, '') || ', ' || COALESCE(p.first_name, '') as display_name,
    o.name as organization_name,
    p.email,
    COALESCE(o.address->>'city', '') || ', ' || COALESCE(o.address->>'state', '') as city_state,
    o.type as org_type
  FROM profiles p
  JOIN user_org_roles uor ON uor.user_id = p.user_id
  JOIN organizations o ON o.id = uor.organization_id
  WHERE 
    o.id != _user_org_id
    AND (
      -- In trusted partners
      EXISTS (
        SELECT 1 FROM trusted_partners tp 
        WHERE tp.organization_id = _user_org_id AND tp.partner_org_id = o.id
      )
      -- Or connected via a project
      OR EXISTS (
        SELECT 1 FROM project_participants pp1
        JOIN project_participants pp2 ON pp1.project_id = pp2.project_id
        WHERE pp1.organization_id = _user_org_id 
          AND pp2.organization_id = o.id
          AND pp1.invite_status = 'ACCEPTED'
          AND pp2.invite_status = 'ACCEPTED'
      )
    )
    AND (
      lower(COALESCE(p.first_name, '')) LIKE '%' || _query_lower || '%'
      OR lower(COALESCE(p.last_name, '')) LIKE '%' || _query_lower || '%'
      OR lower(p.email) LIKE '%' || _query_lower || '%'
    )
  LIMIT _limit / 2;
END;
$$;