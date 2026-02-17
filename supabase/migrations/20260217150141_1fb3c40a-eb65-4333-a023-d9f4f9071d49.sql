
-- 1. Add allow_join_requests to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS allow_join_requests BOOLEAN NOT NULL DEFAULT true;

-- 2. Create org_join_requests table
CREATE TABLE public.org_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);

ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own join requests"
  ON public.org_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org admins can view requests for their org
CREATE POLICY "Org admins can view join requests"
  ON public.org_join_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid()
    AND organization_id = org_join_requests.organization_id
    AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  ));

-- Authenticated users can create join requests
CREATE POLICY "Users can create join requests"
  ON public.org_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can update (approve/reject)
CREATE POLICY "Org admins can update join requests"
  ON public.org_join_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid()
    AND organization_id = org_join_requests.organization_id
    AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  ));

-- 3. Update project status default to 'setup'
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'setup';

-- 4. Search organizations for join flow
CREATE OR REPLACE FUNCTION public.search_organizations_for_join(
  _state TEXT DEFAULT NULL,
  _trade TEXT DEFAULT NULL,
  _query TEXT DEFAULT NULL,
  _limit INT DEFAULT 20
)
RETURNS TABLE(
  org_id UUID,
  org_name TEXT,
  org_type TEXT,
  org_trade TEXT,
  org_address JSONB,
  admin_name TEXT,
  allow_join_requests BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    o.type::TEXT AS org_type,
    o.trade AS org_trade,
    o.address AS org_address,
    (SELECT p.full_name FROM profiles p
     JOIN user_org_roles uor ON uor.user_id = p.user_id
     WHERE uor.organization_id = o.id
     AND uor.role IN ('GC_PM', 'TC_PM', 'FC_PM')
     LIMIT 1
    ) AS admin_name,
    o.allow_join_requests
  FROM organizations o
  WHERE
    (_state IS NULL OR _state = '' OR (o.address->>'state') ILIKE _state)
    AND (_trade IS NULL OR _trade = '' OR o.trade ILIKE '%' || _trade || '%')
    AND (_query IS NULL OR _query = '' OR o.name ILIKE '%' || _query || '%')
  ORDER BY o.name
  LIMIT _limit;
END;
$$;

-- 5. Approve join request RPC
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _req org_join_requests;
  _org_type org_type;
  _role app_role;
BEGIN
  -- Get the request
  SELECT * INTO _req FROM org_join_requests WHERE id = _request_id AND status = 'pending';
  IF _req.id IS NULL THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;

  -- Check caller is admin of the org
  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = _caller_id
    AND organization_id = _req.organization_id
    AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve join requests';
  END IF;

  -- Check user doesn't already have an org
  IF EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = _req.user_id) THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Get org type to determine role
  SELECT type INTO _org_type FROM organizations WHERE id = _req.organization_id;
  _role := CASE _org_type
    WHEN 'GC' THEN 'GC_PM'::app_role
    WHEN 'TC' THEN 'FS'::app_role
    WHEN 'FC' THEN 'FS'::app_role
    WHEN 'SUPPLIER' THEN 'SUPPLIER'::app_role
  END;

  -- Create user_org_role
  INSERT INTO user_org_roles (user_id, organization_id, role)
  VALUES (_req.user_id, _req.organization_id, _role);

  -- Update request
  UPDATE org_join_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = _caller_id
  WHERE id = _request_id;
END;
$$;

-- 6. Reject join request RPC
CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _req org_join_requests;
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
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE org_join_requests
  SET status = 'rejected', reviewed_at = now(), reviewed_by = _caller_id
  WHERE id = _request_id;
END;
$$;
