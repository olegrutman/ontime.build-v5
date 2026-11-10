CREATE OR REPLACE FUNCTION public.update_co_description(
  _co_id uuid, _line_item_id uuid, _title text, _description text, _request_review boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.change_orders; li public.co_line_items; owner_org uuid;
BEGIN
  SELECT * INTO c FROM public.change_orders WHERE id=_co_id;
  IF c.id IS NULL OR c.status='withdrawn' THEN RAISE EXCEPTION 'Order not editable'; END IF;
  IF _line_item_id IS NOT NULL THEN
    SELECT * INTO li FROM public.co_line_items WHERE id=_line_item_id AND co_id=_co_id;
    IF li.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
    owner_org:=li.org_id;
  ELSE
    owner_org:=c.org_id;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_org_roles WHERE user_id=auth.uid() AND organization_id=owner_org) THEN
    RAISE EXCEPTION 'Only the creator can edit this description';
  END IF;
  IF NOT _request_review THEN PERFORM set_config('app.skip_co_correction','on',true); END IF;
  IF _line_item_id IS NOT NULL THEN
    UPDATE public.co_line_items SET item_name=COALESCE(NULLIF(btrim(_title),''),item_name), description=NULLIF(btrim(_description),'') WHERE id=_line_item_id;
  ELSE
    UPDATE public.change_orders SET title=COALESCE(NULLIF(btrim(_title),''),title), problem_summary=NULLIF(btrim(_description),'') WHERE id=_co_id;
    IF _request_review AND NOT EXISTS(SELECT 1 FROM public.co_corrections WHERE co_id=_co_id AND changed_at > now() - interval '2 seconds') THEN
      INSERT INTO public.co_corrections(co_id,from_org_id,to_org_id,project_id,changed_by)
      VALUES(_co_id,c.org_id,c.assigned_to_org_id,c.project_id,auth.uid())
      ON CONFLICT(co_id,from_org_id) DO UPDATE SET version=co_corrections.version+1,state='needs_correction',changed_at=now(),changed_by=auth.uid();
    END IF;
  END IF;
  PERFORM set_config('app.skip_co_correction','off',true);
END; $$;
REVOKE ALL ON FUNCTION public.update_co_description(uuid,uuid,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_co_description(uuid,uuid,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.track_co_correction()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.change_orders; row_data jsonb; old_data jsonb; cid uuid; oid uuid; recipient uuid; changed boolean:=false;
BEGIN
 IF current_setting('app.skip_co_correction', true) = 'on' THEN RETURN NULL; END IF;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 old_data:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
 cid:=CASE WHEN TG_TABLE_NAME='change_orders' THEN (row_data->>'id')::uuid ELSE (row_data->>'co_id')::uuid END;
 SELECT * INTO c FROM public.change_orders WHERE id=cid FOR UPDATE;
 IF c.id IS NULL OR c.status IN ('withdrawn','rejected') THEN RETURN NULL; END IF;
 oid:=(row_data->>'org_id')::uuid;
 IF TG_TABLE_NAME='change_orders' THEN
   SELECT u.organization_id INTO oid FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND (u.organization_id=c.org_id OR u.organization_id=c.assigned_to_org_id) ORDER BY (u.organization_id=c.org_id) DESC LIMIT 1;
   IF oid IS NULL THEN oid:=c.org_id; END IF;
   changed:=jsonb_build_array(row_data->'title',row_data->'reason',row_data->'reason_note',row_data->'location_tag',row_data->'pricing_type',row_data->'nte_cap',row_data->'materials_responsible',row_data->'equipment_responsible',row_data->'co_material_responsible_override',row_data->'co_equipment_responsible_override',row_data->'use_fc_pricing_base') IS DISTINCT FROM jsonb_build_array(old_data->'title',old_data->'reason',old_data->'reason_note',old_data->'location_tag',old_data->'pricing_type',old_data->'nte_cap',old_data->'materials_responsible',old_data->'equipment_responsible',old_data->'co_material_responsible_override',old_data->'co_equipment_responsible_override',old_data->'use_fc_pricing_base');
 ELSIF TG_TABLE_NAME='co_labor_entries' THEN
   IF COALESCE((row_data->>'is_actual_cost')::boolean,false) AND COALESCE((old_data->>'is_actual_cost')::boolean,true) THEN RETURN NULL; END IF;
   changed:=TG_OP<>'UPDATE' OR jsonb_build_array(row_data->'co_line_item_id',row_data->'description',row_data->'pricing_mode',row_data->'hours',row_data->'hourly_rate',row_data->'lump_sum',row_data->'line_total',row_data->'is_actual_cost',row_data->'crew_size',row_data->'days',row_data->'hours_per_day') IS DISTINCT FROM jsonb_build_array(old_data->'co_line_item_id',old_data->'description',old_data->'pricing_mode',old_data->'hours',old_data->'hourly_rate',old_data->'lump_sum',old_data->'line_total',old_data->'is_actual_cost',old_data->'crew_size',old_data->'days',old_data->'hours_per_day');
 ELSIF TG_TABLE_NAME='co_line_items' THEN
   changed:=TG_OP<>'UPDATE' OR (row_data - ARRAY['sort_order','created_at','ai_confidence','ai_reasoning']) IS DISTINCT FROM (old_data - ARRAY['sort_order','created_at','ai_confidence','ai_reasoning']);
 ELSE
   changed:=TG_OP<>'UPDATE' OR jsonb_build_array(row_data->'description',row_data->'quantity',row_data->'uom',row_data->'billed_amount',row_data->'duration_note',row_data->'notes') IS DISTINCT FROM jsonb_build_array(old_data->'description',old_data->'quantity',old_data->'uom',old_data->'billed_amount',old_data->'duration_note',old_data->'notes');
 END IF;
 IF NOT changed OR oid IS NULL THEN RETURN NULL; END IF;
 recipient:=CASE WHEN oid=c.org_id THEN c.assigned_to_org_id ELSE c.org_id END;
 IF EXISTS(SELECT 1 FROM public.organizations WHERE id=oid AND type='FC') THEN
   SELECT pc.to_org_id INTO recipient FROM public.project_contracts pc WHERE pc.project_id=c.project_id AND pc.from_org_id=oid AND pc.to_role IN ('TC','Subcontractor') ORDER BY pc.created_at LIMIT 1;
   IF recipient IS NULL THEN recipient:=CASE WHEN c.created_by_role='FC' AND c.org_id=oid THEN c.assigned_to_org_id ELSE c.org_id END; END IF;
 END IF;
 INSERT INTO public.co_corrections(co_id,from_org_id,to_org_id,project_id,changed_by) VALUES(cid,oid,recipient,c.project_id,auth.uid()) ON CONFLICT(co_id,from_org_id) DO UPDATE SET version=co_corrections.version+1,state='needs_correction',changed_at=now(),changed_by=auth.uid();
 RETURN NULL;
END; $function$;