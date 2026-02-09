
CREATE OR REPLACE FUNCTION public.finalize_tm_work_order(
  p_change_order_id UUID,
  p_fc_hours NUMERIC,
  p_fc_rate NUMERIC,
  p_tc_hours NUMERIC,
  p_tc_rate NUMERIC,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate caller is a participant on the project
  IF NOT EXISTS (
    SELECT 1 FROM change_order_participants cop
    WHERE cop.change_order_id = p_change_order_id
      AND cop.is_active = true
      AND EXISTS (
        SELECT 1 FROM user_org_roles uor
        WHERE uor.user_id = p_user_id
          AND uor.organization_id = cop.organization_id
      )
  ) THEN
    RAISE EXCEPTION 'User is not a participant on this work order';
  END IF;

  -- Insert FC labor entry (locked)
  INSERT INTO change_order_fc_hours (
    change_order_id, hours, hourly_rate, labor_total,
    pricing_type, description, entered_by,
    is_locked, locked_at, locked_by
  ) VALUES (
    p_change_order_id, p_fc_hours, p_fc_rate, p_fc_hours * p_fc_rate,
    'hourly', 'T&M finalized — field crew hours', p_user_id,
    true, now(), p_user_id
  );

  -- Insert TC labor entry
  INSERT INTO change_order_tc_labor (
    change_order_id, hours, hourly_rate, labor_total,
    pricing_type, description, entered_by
  ) VALUES (
    p_change_order_id, p_tc_hours, p_tc_rate, p_tc_hours * p_tc_rate,
    'hourly', 'T&M finalized — total labor', p_user_id
  );

  -- Switch pricing mode to fixed
  UPDATE change_order_projects
  SET pricing_mode = 'fixed', updated_at = now()
  WHERE id = p_change_order_id;
END;
$$;
