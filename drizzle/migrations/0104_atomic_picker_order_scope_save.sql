CREATE OR REPLACE FUNCTION public.save_picker_order(
  _project_id uuid,
  _existing_co_id uuid,
  _orders jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor_org uuid;
  v_actor_role text;
  v_existing public.change_orders;
  v_order jsonb;
  v_line jsonb;
  v_assigned uuid;
  v_target_type text;
  v_fc_org uuid;
  v_fc_type text;
  v_co_id uuid;
  v_ids jsonb := '[]'::jsonb;
  v_next_sort integer;
  v_materials boolean := false;
  v_equipment boolean := false;
  v_material_responsible text;
  v_equipment_responsible text;
  v_active_collaborator boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized' USING errcode = '42501'; END IF;
  IF _project_id IS NULL OR NOT public.can_see_project(_project_id) THEN
    RAISE EXCEPTION 'Project not found' USING errcode = '42501';
  END IF;
  IF _orders IS NULL OR jsonb_typeof(_orders) <> 'array' OR jsonb_array_length(_orders) = 0 THEN
    RAISE EXCEPTION 'Add at least one scope item before saving';
  END IF;

  SELECT pp.organization_id, o.type INTO v_actor_org, v_actor_role
  FROM public.project_participants pp
  JOIN public.organizations o ON o.id = pp.organization_id
  JOIN public.user_org_roles uor ON uor.organization_id = pp.organization_id AND uor.user_id = auth.uid()
  WHERE pp.project_id = _project_id AND pp.invite_status = 'ACCEPTED'
  ORDER BY pp.created_at
  LIMIT 1;
  IF v_actor_org IS NULL OR v_actor_role NOT IN ('GC', 'TC', 'FC') THEN
    RAISE EXCEPTION 'Your company does not have access to create work on this project' USING errcode = '42501';
  END IF;

  IF _existing_co_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.change_orders WHERE id = _existing_co_id AND project_id = _project_id FOR UPDATE;
    IF v_existing.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.change_order_collaborators cc
      WHERE cc.co_id = v_existing.id AND cc.organization_id = v_actor_org AND cc.status = 'active'
    ) INTO v_active_collaborator;
    IF v_existing.org_id <> v_actor_org AND v_existing.assigned_to_org_id IS DISTINCT FROM v_actor_org AND NOT v_active_collaborator THEN
      RAISE EXCEPTION 'Your company cannot add scope to this order' USING errcode = '42501';
    END IF;
    IF v_existing.status NOT IN ('draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'rejected')
       AND NOT (v_active_collaborator AND v_existing.status IN ('submitted', 'approved', 'contracted')) THEN
      RAISE EXCEPTION 'This order is locked against scope additions';
    END IF;
    SELECT COALESCE(max(li.sort_order), 0) + 1 INTO v_next_sort FROM public.co_line_items li WHERE li.co_id = v_existing.id;
  END IF;

  FOR v_order IN SELECT value FROM jsonb_array_elements(_orders)
  LOOP
    IF v_order->'lines' IS NULL OR jsonb_typeof(v_order->'lines') <> 'array' OR jsonb_array_length(v_order->'lines') = 0 THEN
      RAISE EXCEPTION 'Every item must contain at least one scope line';
    END IF;

    IF _existing_co_id IS NULL THEN
      v_assigned := NULLIF(v_order->>'assigned_to_org_id', '')::uuid;
      IF v_assigned IS NULL OR v_assigned = v_actor_org THEN
        RAISE EXCEPTION 'Choose a valid upstream recipient before creating the order';
      END IF;
      SELECT o.type INTO v_target_type
      FROM public.project_participants pp JOIN public.organizations o ON o.id = pp.organization_id
      WHERE pp.project_id = _project_id AND pp.organization_id = v_assigned AND pp.invite_status = 'ACCEPTED';
      IF v_target_type IS NULL THEN RAISE EXCEPTION 'The selected recipient is not active on this project'; END IF;
      IF (v_actor_role = 'GC' AND v_target_type <> 'TC')
         OR (v_actor_role = 'TC' AND v_target_type <> 'GC') THEN
        RAISE EXCEPTION 'The selected recipient does not follow the project approval hierarchy';
      END IF;
      IF v_actor_role = 'FC' AND v_target_type <> 'TC' THEN
        IF v_target_type <> 'GC'
           OR EXISTS (SELECT 1 FROM public.project_participants pp JOIN public.organizations o ON o.id = pp.organization_id WHERE pp.project_id = _project_id AND pp.invite_status = 'ACCEPTED' AND o.type = 'TC')
           OR NOT EXISTS (SELECT 1 FROM public.project_contracts pc WHERE pc.project_id = _project_id AND pc.from_org_id = v_actor_org AND pc.to_org_id = v_assigned) THEN
          RAISE EXCEPTION 'Crew work must go to its Subcontractor first';
        END IF;
      END IF;

      v_fc_org := NULLIF(v_order->>'collaboration_fc_org_id', '')::uuid;
      IF v_fc_org IS NOT NULL THEN
        IF v_actor_role = 'FC' THEN RAISE EXCEPTION 'A Crew creator cannot invite another Crew through this flow'; END IF;
        SELECT o.type INTO v_fc_type
        FROM public.project_participants pp JOIN public.organizations o ON o.id = pp.organization_id
        WHERE pp.project_id = _project_id AND pp.organization_id = v_fc_org AND pp.invite_status = 'ACCEPTED';
        IF v_fc_type IS DISTINCT FROM 'FC' THEN RAISE EXCEPTION 'The selected Crew company is not active on this project'; END IF;
      END IF;

      INSERT INTO public.change_orders (
        org_id, project_id, created_by_user_id, created_by_role, co_number, title,
        status, pricing_type, document_type, reason, reason_note, location_tag,
        assigned_to_org_id, fc_input_needed, materials_needed, equipment_needed,
        materials_responsible, equipment_responsible, blocked_by_rfi_id
      ) VALUES (
        v_actor_org, _project_id, auth.uid(), v_actor_role,
        NULLIF(btrim(v_order->>'co_number'), ''), NULLIF(btrim(v_order->>'title'), ''),
        'draft', v_order->>'pricing_type', v_order->>'document_type',
        COALESCE(v_order->>'reason', 'owner_request'), v_order->>'reason_note', v_order->>'location_tag',
        v_assigned, v_fc_org IS NOT NULL,
        COALESCE((v_order->>'materials_needed')::boolean, false),
        COALESCE((v_order->>'equipment_needed')::boolean, false),
        v_order->>'materials_responsible', v_order->>'equipment_responsible',
        NULLIF(v_order->>'blocked_by_rfi_id', '')::uuid
      ) RETURNING id INTO v_co_id;
      v_next_sort := 1;
      v_ids := v_ids || jsonb_build_array(v_co_id);

      IF v_fc_org IS NOT NULL THEN
        INSERT INTO public.change_order_collaborators (
          co_id, organization_id, collaborator_type, status, invited_by_user_id
        ) VALUES (v_co_id, v_fc_org, 'FC', 'active', auth.uid());
      END IF;
    ELSE
      v_co_id := v_existing.id;
      v_materials := v_materials OR COALESCE((v_order->>'materials_needed')::boolean, false);
      v_equipment := v_equipment OR COALESCE((v_order->>'equipment_needed')::boolean, false);
      v_material_responsible := COALESCE(v_order->>'materials_responsible', v_material_responsible);
      v_equipment_responsible := COALESCE(v_order->>'equipment_responsible', v_equipment_responsible);
      v_ids := jsonb_build_array(v_co_id);
    END IF;

    FOR v_line IN SELECT value FROM jsonb_array_elements(v_order->'lines')
    LOOP
      INSERT INTO public.co_line_items (
        co_id, org_id, created_by_role, item_name, description, unit, sort_order,
        location_tag, reason, task_phase, group_key
      ) VALUES (
        v_co_id, v_actor_org, v_actor_role,
        NULLIF(btrim(v_line->>'item_name'), ''), v_line->>'description',
        COALESCE(NULLIF(v_line->>'unit', ''), 'EA'), v_next_sort,
        v_line->>'location_tag', COALESCE(v_line->>'reason', v_order->>'reason', 'owner_request'),
        v_line->>'task_phase', v_line->>'group_key'
      );
      v_next_sort := v_next_sort + 1;
    END LOOP;
  END LOOP;

  IF _existing_co_id IS NOT NULL THEN
    UPDATE public.change_orders
    SET materials_needed = materials_needed OR v_materials,
        equipment_needed = equipment_needed OR v_equipment,
        materials_responsible = CASE WHEN v_materials THEN COALESCE(v_material_responsible, materials_responsible) ELSE materials_responsible END,
        equipment_responsible = CASE WHEN v_equipment THEN COALESCE(v_equipment_responsible, equipment_responsible) ELSE equipment_responsible END,
        updated_at = now()
    WHERE id = v_existing.id;
    INSERT INTO public.co_activity(co_id, project_id, actor_user_id, actor_role, action, detail)
    VALUES (v_existing.id, _project_id, auth.uid(), v_actor_role, 'scope_added',
      'Added ' || jsonb_array_length(_orders) || ' item(s) via picker');
  END IF;

  RETURN jsonb_build_object('co_ids', v_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.save_picker_order(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_picker_order(uuid, uuid, jsonb) TO authenticated;