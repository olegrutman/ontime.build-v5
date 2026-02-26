
-- 1. New trigger: Auto-set materials_priced when linked PO reaches PRICED status
CREATE OR REPLACE FUNCTION public.fn_sync_po_status_to_wo_checklist()
RETURNS trigger AS $$
DECLARE
  v_co_id UUID;
BEGIN
  IF NEW.status IN ('PRICED','ORDERED','FINALIZED','READY_FOR_DELIVERY','DELIVERED')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('PRICED','ORDERED','FINALIZED','READY_FOR_DELIVERY','DELIVERED'))
  THEN
    SELECT id INTO v_co_id
    FROM change_order_projects
    WHERE linked_po_id = NEW.id
    LIMIT 1;

    IF v_co_id IS NOT NULL THEN
      UPDATE change_order_checklist
      SET materials_priced = true, updated_at = now()
      WHERE change_order_id = v_co_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_sync_po_status_to_wo_checklist
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_po_status_to_wo_checklist();

-- 2. Update convert_change_order_to_contract to finalize linked PO on approval
CREATE OR REPLACE FUNCTION public.convert_change_order_to_contract()
RETURNS trigger AS $$
DECLARE
  v_project projects;
  v_gc_org_id UUID;
  v_tc_org_id UUID;
  v_fc_participant change_order_participants;
  v_contract_id UUID;
  v_sov_id UUID;
  v_fc_contract_id UUID;
  v_fc_sov_id UUID;
  v_fc_labor_total NUMERIC := 0;
  v_next_sort_order INT := 0;
  v_item_description TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    PERFORM set_config('row_security', 'off', true);

    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;

    SELECT pp.organization_id INTO v_gc_org_id
    FROM project_participants pp
    WHERE pp.project_id = NEW.project_id
      AND pp.role = 'GC'
      AND pp.invite_status = 'ACCEPTED'
    LIMIT 1;

    SELECT pp.organization_id INTO v_tc_org_id
    FROM project_participants pp
    WHERE pp.project_id = NEW.project_id
      AND pp.role = 'TC'
      AND pp.invite_status = 'ACCEPTED'
    LIMIT 1;

    IF v_gc_org_id IS NULL THEN
      RAISE EXCEPTION 'No General Contractor found on project';
    END IF;

    IF v_tc_org_id IS NULL THEN
      RAISE EXCEPTION 'No Trade Contractor found on project';
    END IF;

    IF v_gc_org_id = v_tc_org_id THEN
      RAISE EXCEPTION 'GC and TC cannot be the same organization';
    END IF;

    INSERT INTO project_contracts (
      project_id, from_org_id, from_role, to_org_id, to_role,
      trade, contract_sum, notes, status
    ) VALUES (
      NEW.project_id, v_tc_org_id, 'Trade Contractor',
      v_gc_org_id, 'General Contractor', 'Work Order',
      NEW.final_price, 'Auto-generated from Work Order: ' || NEW.title, 'Active'
    ) RETURNING id INTO v_contract_id;

    v_item_description := NEW.title;
    IF NEW.description IS NOT NULL AND NEW.description != '' THEN
      v_item_description := v_item_description || ': ' || NEW.description;
    END IF;

    INSERT INTO project_sov (project_id, contract_id, sov_name)
    VALUES (NEW.project_id, v_contract_id, 'WO: ' || NEW.title)
    RETURNING id INTO v_sov_id;

    INSERT INTO project_sov_items (
      sov_id, project_id, sort_order, item_name, source,
      default_enabled, percent_of_contract, value_amount, scheduled_value
    ) VALUES (
      v_sov_id, NEW.project_id, 0, v_item_description, 'user',
      true, 100.00, NEW.final_price, NEW.final_price
    );

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

      IF v_fc_labor_total > 0 THEN
        INSERT INTO project_contracts (
          project_id, from_org_id, from_role, to_org_id, to_role,
          trade, contract_sum, notes, status
        ) VALUES (
          NEW.project_id, v_fc_participant.organization_id, 'Field Crew',
          v_tc_org_id, 'Trade Contractor', 'Work Order Labor',
          v_fc_labor_total, 'Private - Auto-generated from Work Order: ' || NEW.title, 'Active'
        ) RETURNING id INTO v_fc_contract_id;

        INSERT INTO project_sov (project_id, contract_id, sov_name)
        VALUES (NEW.project_id, v_fc_contract_id, 'WO Labor: ' || NEW.title)
        RETURNING id INTO v_fc_sov_id;

        INSERT INTO project_sov_items (
          sov_id, project_id, sort_order, item_name, source,
          default_enabled, percent_of_contract, value_amount, scheduled_value
        ) VALUES (
          v_fc_sov_id, NEW.project_id, 0, v_item_description || ' (Labor)', 'user',
          true, 100.00, v_fc_labor_total, v_fc_labor_total
        );
      END IF;
    END IF;

    -- Finalize linked PO on work order approval
    IF NEW.linked_po_id IS NOT NULL THEN
      UPDATE purchase_orders
      SET status = 'FINALIZED', updated_at = now()
      WHERE id = NEW.linked_po_id
        AND status NOT IN ('FINALIZED','READY_FOR_DELIVERY','DELIVERED');
    END IF;

    NEW.status := 'contracted';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
