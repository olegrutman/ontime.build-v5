CREATE OR REPLACE FUNCTION public.ensure_tm_project_contracts(_project_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_type text; v_gc uuid; v_tc uuid; v_fc uuid; v_creator uuid; v_mat text; v_cid uuid;
BEGIN
  SELECT project_type, created_by INTO v_type, v_creator FROM projects WHERE id = _project_id;
  IF v_type IS NULL OR NOT (v_type ILIKE '%remodel%' OR v_type ILIKE '%T&M%') THEN RETURN; END IF;
  SELECT organization_id INTO v_gc FROM project_participants WHERE project_id=_project_id AND role='GC' AND invite_status='ACCEPTED' ORDER BY accepted_at NULLS LAST LIMIT 1;
  SELECT organization_id INTO v_tc FROM project_participants WHERE project_id=_project_id AND role='TC' AND invite_status='ACCEPTED' ORDER BY accepted_at NULLS LAST LIMIT 1;
  SELECT organization_id INTO v_fc FROM project_participants WHERE project_id=_project_id AND role='FC' AND invite_status='ACCEPTED' ORDER BY accepted_at NULLS LAST LIMIT 1;
  SELECT material_responsibility INTO v_mat FROM project_participants WHERE project_id=_project_id AND material_responsibility IS NOT NULL ORDER BY invited_at NULLS LAST LIMIT 1;
  IF v_gc IS NOT NULL AND v_tc IS NOT NULL THEN
    v_cid := _co_target_contract_id(_project_id, v_tc, v_gc);
    IF v_cid IS NULL THEN
      INSERT INTO project_contracts(project_id, from_org_id, to_org_id, from_role, to_role, contract_sum, original_contract_sum, status, created_by_user_id, notes, material_responsibility)
      VALUES (_project_id, v_tc, v_gc, 'Subcontractor', 'General Contractor', 0, 0, 'Active', v_creator, 'Remodel / T&M work-order contract', v_mat);
    ELSIF v_mat IS NOT NULL THEN
      UPDATE project_contracts SET material_responsibility = v_mat WHERE id = v_cid AND material_responsibility IS NULL;
    END IF;
  END IF;
  IF v_tc IS NOT NULL AND v_fc IS NOT NULL AND _co_target_contract_id(_project_id, v_fc, v_tc) IS NULL THEN
    INSERT INTO project_contracts(project_id, from_org_id, to_org_id, from_role, to_role, contract_sum, original_contract_sum, status, created_by_user_id, notes, material_responsibility)
    VALUES (_project_id, v_fc, v_tc, 'Crew', 'Subcontractor', 0, 0, 'Active', v_creator, 'Remodel / T&M work-order contract', v_mat);
  END IF;
END $function$;