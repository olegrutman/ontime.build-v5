-- Make convert_change_order_to_contract run with elevated privileges so it can see
-- project participants regardless of caller RLS context (required for finalization).

CREATE OR REPLACE FUNCTION public.convert_change_order_to_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project projects;
  v_gc_org_id UUID;
  v_tc_org_id UUID;
  v_fc_participant change_order_participants;
  v_contract_id UUID;
  v_sov_id UUID;
  v_fc_contract_id UUID;
  v_fc_labor_total NUMERIC := 0;
  v_next_sort_order INT := 0;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Ensure RLS does not interfere (effective for table owners / security definer)
    PERFORM set_config('row_security', 'off', true);

    -- Get project details
    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;

    -- Find GC org from project_participants
    SELECT pp.organization_id INTO v_gc_org_id
    FROM project_participants pp
    WHERE pp.project_id = NEW.project_id
      AND pp.role = 'GC'
      AND pp.invite_status = 'ACCEPTED'
    LIMIT 1;

    -- Find TC org from project_participants
    SELECT pp.organization_id INTO v_tc_org_id
    FROM project_participants pp
    WHERE pp.project_id = NEW.project_id
      AND pp.role = 'TC'
      AND pp.invite_status = 'ACCEPTED'
    LIMIT 1;

    -- Validate we have both GC and TC and they are different
    IF v_gc_org_id IS NULL THEN
      RAISE EXCEPTION 'No General Contractor found on project';
    END IF;

    IF v_tc_org_id IS NULL THEN
      RAISE EXCEPTION 'No Trade Contractor found on project';
    END IF;

    IF v_gc_org_id = v_tc_org_id THEN
      RAISE EXCEPTION 'GC and TC cannot be the same organization';
    END IF;

    -- Create the TC → GC contract (TC bills GC, so TC is from_org)
    INSERT INTO project_contracts (
      project_id,
      from_org_id,
      from_role,
      to_org_id,
      to_role,
      trade,
      contract_sum,
      notes,
      status
    ) VALUES (
      NEW.project_id,
      v_tc_org_id,
      'Trade Contractor',
      v_gc_org_id,
      'General Contractor',
      'Work Order',
      NEW.final_price,
      'Auto-generated from Work Order: ' || NEW.title,
      'Active'
    ) RETURNING id INTO v_contract_id;

    -- Get or create SOV for this contract
    SELECT id INTO v_sov_id
    FROM project_sov
    WHERE contract_id = v_contract_id;

    IF v_sov_id IS NULL THEN
      INSERT INTO project_sov (project_id, contract_id, sov_name)
      VALUES (NEW.project_id, v_contract_id, 'Work Orders')
      RETURNING id INTO v_sov_id;
    END IF;

    -- Determine next sort order within this SOV
    SELECT COALESCE(MAX(sort_order), -1) + 1
    INTO v_next_sort_order
    FROM project_sov_items
    WHERE sov_id = v_sov_id;

    -- Add SOV item
    INSERT INTO project_sov_items (
      sov_id,
      project_id,
      sort_order,
      item_name,
      source,
      default_enabled,
      percent_of_contract,
      value_amount,
      scheduled_value
    ) VALUES (
      v_sov_id,
      NEW.project_id,
      v_next_sort_order,
      NEW.title,
      'user',
      true,
      100.00,
      NEW.final_price,
      NEW.final_price
    );

    -- Check if Field Crew participated (active FC participant)
    SELECT cop.* INTO v_fc_participant
    FROM change_order_participants cop
    WHERE cop.change_order_id = NEW.id
      AND cop.role = 'FC'
      AND cop.is_active = true
    LIMIT 1;

    IF v_fc_participant.id IS NOT NULL THEN
      SELECT COALESCE(SUM(labor_total), 0) INTO v_fc_labor_total
      FROM change_order_fc_hours
      WHERE change_order_id = NEW.id
        AND is_locked = true;

      -- FC → TC contract (FC bills TC, so FC is from_org)
      IF v_fc_labor_total > 0 THEN
        INSERT INTO project_contracts (
          project_id,
          from_org_id,
          from_role,
          to_org_id,
          to_role,
          trade,
          contract_sum,
          notes,
          status
        ) VALUES (
          NEW.project_id,
          v_fc_participant.organization_id,
          'Field Crew',
          v_tc_org_id,
          'Trade Contractor',
          'Work Order Labor',
          v_fc_labor_total,
          'Private - Auto-generated from Work Order: ' || NEW.title,
          'Active'
        ) RETURNING id INTO v_fc_contract_id;
      END IF;
    END IF;

    NEW.status := 'contracted';
  END IF;

  RETURN NEW;
END;
$$;

-- Tighten: only allow DB to execute this trigger function (trigger context)
REVOKE ALL ON FUNCTION public.convert_change_order_to_contract() FROM PUBLIC;
