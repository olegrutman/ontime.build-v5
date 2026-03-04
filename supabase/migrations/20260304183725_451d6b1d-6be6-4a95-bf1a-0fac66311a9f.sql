
CREATE OR REPLACE FUNCTION public.remove_org_member(_target_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _target_user_id uuid;
  _target_org_id uuid;
  _target_is_admin boolean;
  _caller_is_admin boolean;
BEGIN
  -- Get target info
  SELECT user_id, organization_id, is_admin
    INTO _target_user_id, _target_org_id, _target_is_admin
    FROM user_org_roles WHERE id = _target_role_id;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Verify caller is admin of same org
  SELECT is_admin INTO _caller_is_admin
    FROM user_org_roles
    WHERE user_id = _caller_id AND organization_id = _target_org_id;

  IF NOT COALESCE(_caller_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  -- Cannot remove yourself
  IF _target_user_id = _caller_id THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  -- Cannot remove the admin (must transfer first)
  IF _target_is_admin THEN
    RAISE EXCEPTION 'Cannot remove an admin. Transfer admin first.';
  END IF;

  -- Delete permissions row if exists
  DELETE FROM member_permissions WHERE user_org_role_id = _target_role_id;

  -- Delete the role
  DELETE FROM user_org_roles WHERE id = _target_role_id;
END;
$$;
