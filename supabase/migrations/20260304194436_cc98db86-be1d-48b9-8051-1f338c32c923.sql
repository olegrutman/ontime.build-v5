
CREATE OR REPLACE FUNCTION public.update_member_job_title(
  _target_user_id uuid,
  _job_title text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _target_org_id uuid;
BEGIN
  -- Verify caller is admin in the same org as the target user
  SELECT uor.organization_id INTO _target_org_id
  FROM user_org_roles uor
  WHERE uor.user_id = _target_user_id
  LIMIT 1;

  IF _target_org_id IS NULL THEN
    RAISE EXCEPTION 'Target user not found in any organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = _caller_id
      AND organization_id = _target_org_id
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only organization admins can update member job titles';
  END IF;

  UPDATE profiles
  SET job_title = _job_title
  WHERE user_id = _target_user_id;
END;
$$;
