-- Fix the trigger function to not use non-existent total_contract_value column
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
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Get project details
    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;
    v_gc_org_id := v_project.organization_id;
    
    -- Find TC participant on the parent project
    SELECT pp.* INTO v_tc_participant
    FROM project_participants pp
    JOIN user_org_roles uor ON uor.organization_id = pp.organization_id
    WHERE pp.project_id = NEW.project_id
    AND pp.role = 'TC'
    AND pp.invite_status = 'ACCEPTED'
    LIMIT 1;
    
    -- If we have a TC, create the GC ↔ TC mini-contract
    IF v_tc_participant.id IS NOT NULL THEN
      -- Create contract
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
        'Change Order',
        NEW.final_price,
        'Auto-generated from Work Order: ' || NEW.title,
        'Active'
      ) RETURNING id INTO v_contract_id;
      
      -- Get or create SOV for this contract
      SELECT id INTO v_sov_id
      FROM project_sov
      WHERE contract_id = v_contract_id;
      
      IF v_sov_id IS NULL THEN
        -- Create SOV without total_contract_value (column doesn't exist)
        INSERT INTO project_sov (project_id, contract_id, sov_name)
        VALUES (NEW.project_id, v_contract_id, 'Work Order: ' || NEW.title)
        RETURNING id INTO v_sov_id;
      END IF;
      
      -- Add SOV line item for this work order
      INSERT INTO project_sov_items (
        sov_id,
        project_id,
        item_number,
        item_name,
        description,
        value_amount,
        percent_of_contract
      ) VALUES (
        v_sov_id,
        NEW.project_id,
        'WO-' || substring(NEW.id::text, 1, 8),
        NEW.title,
        NEW.description,
        NEW.final_price,
        100.00
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
      -- Calculate FC labor total (private)
      SELECT COALESCE(SUM(labor_total), 0) INTO v_fc_labor_total
      FROM change_order_fc_hours
      WHERE change_order_id = NEW.id
      AND is_locked = true;
      
      -- Create private TC ↔ FC mini-contract (GC never sees this)
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
    
    -- Update status to contracted
    NEW.status := 'contracted';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;