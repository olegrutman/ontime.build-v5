CREATE OR REPLACE FUNCTION public.ensure_tm_project_contracts(_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_type text; v_gc uuid; v_tc uuid; v_fc uuid; v_creator uuid;
BEGIN
  SELECT project_type, created_by INTO v_type, v_creator FROM projects WHERE id = _project_id;
  IF v_type IS NULL OR NOT (v_type ILIKE '%remodel%' OR v_type ILIKE '%T&M%') THEN RETURN; END IF;
  SELECT organization_id INTO v_gc FROM project_participants WHERE project_id=_project_id AND role='GC' AND invite_status='ACCEPTED' ORDER BY accepted_at NULLS LAST LIMIT 1;
  SELECT organization_id INTO v_tc FROM project_participants WHERE project_id=_project_id AND role='TC' AND invite_status='ACCEPTED' ORDER BY accepted_at NULLS LAST LIMIT 1;
  SELECT organization_id INTO v_fc FROM project_participants WHERE project_id=_project_id AND role='FC' AND invite_status='ACCEPTED' ORDER BY accepted_at NULLS LAST LIMIT 1;
  IF v_gc IS NOT NULL AND v_tc IS NOT NULL AND _co_target_contract_id(_project_id, v_tc, v_gc) IS NULL THEN
    INSERT INTO project_contracts(project_id, from_org_id, to_org_id, from_role, to_role, contract_sum, original_contract_sum, status, created_by_user_id, notes)
    VALUES (_project_id, v_tc, v_gc, 'Subcontractor', 'General Contractor', 0, 0, 'Active', v_creator, 'Remodel / T&M work-order contract');
  END IF;
  IF v_tc IS NOT NULL AND v_fc IS NOT NULL AND _co_target_contract_id(_project_id, v_fc, v_tc) IS NULL THEN
    INSERT INTO project_contracts(project_id, from_org_id, to_org_id, from_role, to_role, contract_sum, original_contract_sum, status, created_by_user_id, notes)
    VALUES (_project_id, v_fc, v_tc, 'Crew', 'Subcontractor', 0, 0, 'Active', v_creator, 'Remodel / T&M work-order contract');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.ensure_tm_project_contracts(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_ensure_tm_contracts_on_co()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN PERFORM public.ensure_tm_project_contracts(NEW.project_id); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS a_ensure_tm_contracts ON public.change_orders;
CREATE TRIGGER a_ensure_tm_contracts BEFORE INSERT OR UPDATE OF status ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_ensure_tm_contracts_on_co();

CREATE OR REPLACE FUNCTION public.trg_ensure_tm_contracts_on_participant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.invite_status = 'ACCEPTED' THEN PERFORM public.ensure_tm_project_contracts(NEW.project_id); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ensure_tm_contracts_on_participant ON public.project_participants;
CREATE TRIGGER ensure_tm_contracts_on_participant AFTER INSERT OR UPDATE OF invite_status ON public.project_participants
  FOR EACH ROW EXECUTE FUNCTION public.trg_ensure_tm_contracts_on_participant();

DO $$
DECLARE r record; v_cid uuid; v_amt numeric;
BEGIN
  FOR r IN SELECT id FROM projects WHERE project_type ILIKE '%remodel%' OR project_type ILIKE '%T&M%' LOOP
    PERFORM public.ensure_tm_project_contracts(r.id);
  END LOOP;
  FOR r IN SELECT co.* FROM change_orders co JOIN projects p ON p.id=co.project_id
           WHERE (p.project_type ILIKE '%remodel%' OR p.project_type ILIKE '%T&M%')
             AND co.status IN ('approved','contracted','completed') AND co.approved_at IS NOT NULL
             AND co.org_id IS NOT NULL AND co.assigned_to_org_id IS NOT NULL LOOP
    v_cid := public._co_target_contract_id(r.project_id, r.org_id, r.assigned_to_org_id);
    IF v_cid IS NOT NULL THEN
      v_amt := public.co_grand_total(r.id);
      UPDATE project_contracts SET contract_sum = COALESCE(contract_sum,0)+v_amt,
        co_approved_sum = COALESCE(co_approved_sum,0)+v_amt, updated_at=now() WHERE id=v_cid AND notes='Remodel / T&M work-order contract';
    END IF;
  END LOOP;
END $$;