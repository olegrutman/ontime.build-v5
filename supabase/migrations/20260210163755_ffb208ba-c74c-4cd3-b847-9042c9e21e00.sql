CREATE OR REPLACE FUNCTION public.change_org_member_role(
  p_member_role_id UUID,
  p_new_role TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_target_user_id UUID;
  v_org_type TEXT;
BEGIN
  SELECT organization_id, user_id INTO v_org_id, v_target_user_id
  FROM user_org_roles WHERE id = p_member_role_id;

  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid() AND organization_id = v_org_id
      AND role IN ('GC_PM','TC_PM','FC_PM')
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF v_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  SELECT type INTO v_org_type FROM organizations WHERE id = v_org_id;
  IF NOT (
    (v_org_type = 'GC' AND p_new_role IN ('GC_PM')) OR
    (v_org_type = 'TC' AND p_new_role IN ('TC_PM','FS')) OR
    (v_org_type = 'FC' AND p_new_role IN ('FC_PM','FS')) OR
    (v_org_type = 'SUPPLIER' AND p_new_role IN ('SUPPLIER'))
  ) THEN RAISE EXCEPTION 'Invalid role for org type'; END IF;

  UPDATE user_org_roles SET role = p_new_role::app_role
  WHERE id = p_member_role_id;
END;
$$;