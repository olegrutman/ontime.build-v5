
-- 1. Add is_admin column to user_org_roles
ALTER TABLE public.user_org_roles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Set existing org creators as admins
UPDATE public.user_org_roles uor
SET is_admin = true
FROM public.organizations o
WHERE uor.organization_id = o.id
  AND uor.user_id = o.created_by;

-- 3. Create member_permissions table
CREATE TABLE public.member_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_org_role_id UUID NOT NULL REFERENCES public.user_org_roles(id) ON DELETE CASCADE UNIQUE,
  can_approve_invoices BOOLEAN NOT NULL DEFAULT false,
  can_create_work_orders BOOLEAN NOT NULL DEFAULT false,
  can_create_pos BOOLEAN NOT NULL DEFAULT false,
  can_manage_team BOOLEAN NOT NULL DEFAULT false,
  can_view_financials BOOLEAN NOT NULL DEFAULT false,
  can_submit_time BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on member_permissions
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS: members of same org can read permissions
CREATE POLICY "Members can view own org permissions"
ON public.member_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_org_roles target_role
    JOIN public.user_org_roles my_role ON my_role.organization_id = target_role.organization_id
    WHERE target_role.id = member_permissions.user_org_role_id
      AND my_role.user_id = auth.uid()
  )
);

-- 6. RLS: only admins can update permissions
CREATE POLICY "Admins can update member permissions"
ON public.member_permissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_org_roles target_role
    JOIN public.user_org_roles my_role ON my_role.organization_id = target_role.organization_id
    WHERE target_role.id = member_permissions.user_org_role_id
      AND my_role.user_id = auth.uid()
      AND my_role.is_admin = true
  )
);

-- 7. Trigger to auto-create member_permissions on user_org_roles insert
CREATE OR REPLACE FUNCTION public.auto_create_member_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_permissions (user_org_role_id)
  VALUES (NEW.id)
  ON CONFLICT (user_org_role_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_member_permissions
AFTER INSERT ON public.user_org_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_member_permissions();

-- 8. Backfill member_permissions for existing user_org_roles
INSERT INTO public.member_permissions (user_org_role_id)
SELECT id FROM public.user_org_roles
ON CONFLICT (user_org_role_id) DO NOTHING;

-- 9. Give admins full permissions by default
UPDATE public.member_permissions mp
SET can_approve_invoices = true,
    can_create_work_orders = true,
    can_create_pos = true,
    can_manage_team = true,
    can_view_financials = true,
    can_submit_time = true
FROM public.user_org_roles uor
WHERE mp.user_org_role_id = uor.id
  AND uor.is_admin = true;

-- 10. Transfer admin RPC
CREATE OR REPLACE FUNCTION public.transfer_admin(_target_role_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _org_id UUID;
  _caller_role_id UUID;
BEGIN
  -- Get caller's org role (must be admin)
  SELECT uor.id, uor.organization_id INTO _caller_role_id, _org_id
  FROM user_org_roles uor
  WHERE uor.user_id = _caller_id AND uor.is_admin = true
  LIMIT 1;

  IF _caller_role_id IS NULL THEN
    RAISE EXCEPTION 'You are not an admin';
  END IF;

  -- Verify target is in same org
  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles WHERE id = _target_role_id AND organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Target member not in your organization';
  END IF;

  -- Remove admin from caller
  UPDATE user_org_roles SET is_admin = false WHERE id = _caller_role_id;

  -- Set admin on target
  UPDATE user_org_roles SET is_admin = true WHERE id = _target_role_id;

  -- Give new admin full permissions
  UPDATE member_permissions
  SET can_approve_invoices = true,
      can_create_work_orders = true,
      can_create_pos = true,
      can_manage_team = true,
      can_view_financials = true,
      can_submit_time = true
  WHERE user_org_role_id = _target_role_id;
END;
$$;

-- 11. Update member permissions RPC
CREATE OR REPLACE FUNCTION public.update_member_permissions(
  _target_role_id UUID,
  _can_approve_invoices BOOLEAN DEFAULT NULL,
  _can_create_work_orders BOOLEAN DEFAULT NULL,
  _can_create_pos BOOLEAN DEFAULT NULL,
  _can_manage_team BOOLEAN DEFAULT NULL,
  _can_view_financials BOOLEAN DEFAULT NULL,
  _can_submit_time BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _org_id UUID;
BEGIN
  -- Verify caller is admin in same org as target
  SELECT uor.organization_id INTO _org_id
  FROM user_org_roles uor
  WHERE uor.user_id = _caller_id AND uor.is_admin = true
  LIMIT 1;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'You are not an admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles WHERE id = _target_role_id AND organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Target member not in your organization';
  END IF;

  UPDATE member_permissions
  SET
    can_approve_invoices = COALESCE(_can_approve_invoices, can_approve_invoices),
    can_create_work_orders = COALESCE(_can_create_work_orders, can_create_work_orders),
    can_create_pos = COALESCE(_can_create_pos, can_create_pos),
    can_manage_team = COALESCE(_can_manage_team, can_manage_team),
    can_view_financials = COALESCE(_can_view_financials, can_view_financials),
    can_submit_time = COALESCE(_can_submit_time, can_submit_time),
    updated_at = now()
  WHERE user_org_role_id = _target_role_id;
END;
$$;

-- 12. Fix search_organizations_for_join to use is_admin
CREATE OR REPLACE FUNCTION public.search_organizations_for_join(
  _query TEXT,
  _limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  org_type public.org_type,
  city TEXT,
  state TEXT,
  trade TEXT,
  admin_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.type AS org_type,
    COALESCE(TRIM(o.address->>'city'), '')::TEXT AS city,
    COALESCE(TRIM(o.address->>'state'), '')::TEXT AS state,
    o.trade,
    (
      SELECT p.full_name
      FROM user_org_roles uor2
      JOIN profiles p ON p.user_id = uor2.user_id
      WHERE uor2.organization_id = o.id
        AND uor2.is_admin = true
      LIMIT 1
    ) AS admin_name
  FROM organizations o
  WHERE o.allow_join_requests = true
    AND (
      o.name ILIKE '%' || _query || '%'
      OR o.org_code ILIKE '%' || _query || '%'
    )
  ORDER BY o.name
  LIMIT _limit;
END;
$$;
