-- Fix convert_change_order_to_contract to match actual project_sov_items schema
CREATE OR REPLACE FUNCTION convert_change_order_to_contract()
RETURNS TRIGGER AS $$
DECLARE
  v_project projects;
  v_gc_org_id UUID;
  v_tc_participant project_participants;
  v_fc_participant change_order_participants;
  v_contract_id UUID;
  v_sov_id UUID;
  v_fc_contract_id UUID;
  v_fc_labor_total NUMERIC := 0;
  v_next_sort_order INT := 0;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Get project details
    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;
    v_gc_org_id := v_project.organization_id;

    -- Find TC participant on the parent project (accepted)
    SELECT pp.* INTO v_tc_participant
    FROM project_participants pp
    WHERE pp.project_id = NEW.project_id
      AND pp.role = 'TC'
      AND pp.invite_status = 'ACCEPTED'
    LIMIT 1;

    -- If we have a TC, create the GC ↔ TC mini-contract
    IF v_tc_participant.id IS NOT NULL THEN
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
        v_gc_org_id,
        'General Contractor',
        v_tc_participant.organization_id,
        'Trade Contractor',
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

      -- Add SOV item (match real schema)
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
    END IF;

    -- Check if Field Crew participated (has locked hours)
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

      IF v_fc_labor_total > 0 AND v_tc_participant.id IS NOT NULL THEN
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
          v_tc_participant.organization_id,
          'Trade Contractor',
          v_fc_participant.organization_id,
          'Field Crew',
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;