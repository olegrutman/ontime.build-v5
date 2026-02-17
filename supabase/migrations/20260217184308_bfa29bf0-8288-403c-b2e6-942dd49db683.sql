
-- Add job_title to org_join_requests
ALTER TABLE public.org_join_requests ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Add job_title to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Update approve_join_request to copy job_title to profile
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Copy job_title from join request to profile
  IF _req.job_title IS NOT NULL THEN
    UPDATE profiles SET job_title = _req.job_title WHERE user_id = _req.user_id;
  END IF;

  -- Update request
  UPDATE org_join_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = _caller_id
  WHERE id = _request_id;
END;
$$;
