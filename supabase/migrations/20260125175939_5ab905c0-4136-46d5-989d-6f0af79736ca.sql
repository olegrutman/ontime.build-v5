-- ===========================================
-- Auto-calculation triggers for Change Order totals
-- ===========================================

-- Function to recalculate change order totals
CREATE OR REPLACE FUNCTION public.recalculate_change_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_change_order_id UUID;
  v_labor_total NUMERIC := 0;
  v_material_total NUMERIC := 0;
  v_equipment_total NUMERIC := 0;
  v_final_price NUMERIC := 0;
BEGIN
  -- Determine which change order to update
  IF TG_TABLE_NAME = 'change_order_tc_labor' THEN
    v_change_order_id := COALESCE(NEW.change_order_id, OLD.change_order_id);
  ELSIF TG_TABLE_NAME = 'change_order_materials' THEN
    v_change_order_id := COALESCE(NEW.change_order_id, OLD.change_order_id);
  ELSIF TG_TABLE_NAME = 'change_order_equipment' THEN
    v_change_order_id := COALESCE(NEW.change_order_id, OLD.change_order_id);
  END IF;

  IF v_change_order_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate TC labor total (FC hours are private, not included in GC-visible total)
  SELECT COALESCE(SUM(labor_total), 0) INTO v_labor_total
  FROM change_order_tc_labor
  WHERE change_order_id = v_change_order_id;

  -- Calculate material total (use final_price if set, otherwise line_total)
  SELECT COALESCE(SUM(COALESCE(final_price, line_total, 0)), 0) INTO v_material_total
  FROM change_order_materials
  WHERE change_order_id = v_change_order_id;

  -- Calculate equipment total
  SELECT COALESCE(SUM(total_cost), 0) INTO v_equipment_total
  FROM change_order_equipment
  WHERE change_order_id = v_change_order_id;

  -- Calculate final price
  v_final_price := v_labor_total + v_material_total + v_equipment_total;

  -- Update change order totals
  UPDATE change_order_projects
  SET 
    labor_total = v_labor_total,
    material_total = v_material_total,
    equipment_total = v_equipment_total,
    final_price = v_final_price,
    updated_at = now()
  WHERE id = v_change_order_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on TC labor
DROP TRIGGER IF EXISTS recalc_co_totals_tc_labor ON change_order_tc_labor;
CREATE TRIGGER recalc_co_totals_tc_labor
AFTER INSERT OR UPDATE OR DELETE ON change_order_tc_labor
FOR EACH ROW EXECUTE FUNCTION recalculate_change_order_totals();

-- Create triggers on materials
DROP TRIGGER IF EXISTS recalc_co_totals_materials ON change_order_materials;
CREATE TRIGGER recalc_co_totals_materials
AFTER INSERT OR UPDATE OR DELETE ON change_order_materials
FOR EACH ROW EXECUTE FUNCTION recalculate_change_order_totals();

-- Create triggers on equipment
DROP TRIGGER IF EXISTS recalc_co_totals_equipment ON change_order_equipment;
CREATE TRIGGER recalc_co_totals_equipment
AFTER INSERT OR UPDATE OR DELETE ON change_order_equipment
FOR EACH ROW EXECUTE FUNCTION recalculate_change_order_totals();


-- ===========================================
-- Auto-update checklist flags
-- ===========================================

-- Function to update checklist when FC hours are locked
CREATE OR REPLACE FUNCTION public.update_co_checklist_fc_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_all_locked BOOLEAN;
BEGIN
  -- Check if ALL FC hours for this change order are locked
  SELECT NOT EXISTS (
    SELECT 1 FROM change_order_fc_hours
    WHERE change_order_id = NEW.change_order_id
    AND is_locked = false
  ) INTO v_all_locked;

  -- Update checklist
  UPDATE change_order_checklist
  SET fc_hours_locked = v_all_locked, updated_at = now()
  WHERE change_order_id = NEW.change_order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_checklist_fc_hours ON change_order_fc_hours;
CREATE TRIGGER update_checklist_fc_hours
AFTER INSERT OR UPDATE OF is_locked ON change_order_fc_hours
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_fc_hours();


-- Function to update checklist when materials are priced
CREATE OR REPLACE FUNCTION public.update_co_checklist_materials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_all_priced BOOLEAN;
BEGIN
  -- Check if ALL materials have final_price set
  SELECT NOT EXISTS (
    SELECT 1 FROM change_order_materials
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
    AND final_price IS NULL
  ) INTO v_all_priced;

  -- Update checklist
  UPDATE change_order_checklist
  SET materials_priced = v_all_priced, updated_at = now()
  WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_checklist_materials ON change_order_materials;
CREATE TRIGGER update_checklist_materials
AFTER INSERT OR UPDATE OF final_price OR DELETE ON change_order_materials
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_materials();


-- Function to update checklist when equipment is priced
CREATE OR REPLACE FUNCTION public.update_co_checklist_equipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_all_priced BOOLEAN;
BEGIN
  -- Check if ALL equipment has total_cost set
  SELECT NOT EXISTS (
    SELECT 1 FROM change_order_equipment
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
    AND total_cost IS NULL
  ) INTO v_all_priced;

  -- Update checklist
  UPDATE change_order_checklist
  SET equipment_priced = v_all_priced, updated_at = now()
  WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_checklist_equipment ON change_order_equipment;
CREATE TRIGGER update_checklist_equipment
AFTER INSERT OR UPDATE OF total_cost OR DELETE ON change_order_equipment
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_equipment();


-- Function to update checklist when TC labor is added (indicates TC pricing in progress)
CREATE OR REPLACE FUNCTION public.update_co_checklist_tc_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_pricing BOOLEAN;
BEGIN
  -- Check if there's any TC labor entry
  SELECT EXISTS (
    SELECT 1 FROM change_order_tc_labor
    WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id)
  ) INTO v_has_pricing;

  -- Update checklist
  UPDATE change_order_checklist
  SET tc_pricing_complete = v_has_pricing, updated_at = now()
  WHERE change_order_id = COALESCE(NEW.change_order_id, OLD.change_order_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_checklist_tc_pricing ON change_order_tc_labor;
CREATE TRIGGER update_checklist_tc_pricing
AFTER INSERT OR DELETE ON change_order_tc_labor
FOR EACH ROW EXECUTE FUNCTION update_co_checklist_tc_pricing();


-- ===========================================
-- SOV and Contract generation on approval
-- ===========================================

CREATE OR REPLACE FUNCTION public.convert_change_order_to_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        'Auto-generated from Change Order: ' || NEW.title,
        'Active'
      ) RETURNING id INTO v_contract_id;
      
      -- Get or create SOV for this contract
      SELECT id INTO v_sov_id
      FROM project_sov
      WHERE contract_id = v_contract_id;
      
      IF v_sov_id IS NULL THEN
        INSERT INTO project_sov (project_id, contract_id, total_contract_value)
        VALUES (NEW.project_id, v_contract_id, NEW.final_price)
        RETURNING id INTO v_sov_id;
      END IF;
      
      -- Add SOV line item for this change order
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
        'CO-' || substring(NEW.id::text, 1, 8),
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
          'Change Order Labor',
          v_fc_labor_total,
          'Private - Auto-generated from Change Order: ' || NEW.title,
          'Active'
        ) RETURNING id INTO v_fc_contract_id;
      END IF;
    END IF;
    
    -- Update status to contracted
    NEW.status := 'contracted';
    
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS convert_co_to_contract ON change_order_projects;
CREATE TRIGGER convert_co_to_contract
BEFORE UPDATE OF status ON change_order_projects
FOR EACH ROW EXECUTE FUNCTION convert_change_order_to_contract();