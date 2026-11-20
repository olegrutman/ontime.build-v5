CREATE OR REPLACE FUNCTION public.approve_crew_change_order(_co_id uuid, _keep_internal boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.change_orders; reviewer_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id=_co_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
  IF c.created_by_role<>'FC' THEN RAISE EXCEPTION 'Only crew orders can be approved here'; END IF;
  reviewer_org_id:=CASE WHEN c.status='submitted' THEN c.assigned_to_org_id WHEN c.status='draft' THEN c.org_id END;
  IF reviewer_org_id IS NULL OR NOT public.user_in_org(auth.uid(),reviewer_org_id)
    OR NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=reviewer_org_id AND o.type='TC') THEN
    RAISE EXCEPTION 'You are not authorized to approve this order';
  END IF;
  UPDATE public.change_orders SET crew_approved_at=COALESCE(crew_approved_at,now()),crew_approved_by_user_id=COALESCE(crew_approved_by_user_id,auth.uid()),kept_internal=COALESCE(_keep_internal,false),updated_at=now() WHERE id=_co_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.set_crew_change_order_internal(_co_id uuid,_internal boolean)
RETURNS change_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.change_orders; reviewer_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id=_co_id;
  IF c.id IS NULL OR c.crew_approved_at IS NULL OR c.created_by_role<>'FC' THEN RAISE EXCEPTION 'Only crew-approved orders can be changed'; END IF;
  reviewer_org_id:=CASE WHEN c.status='submitted' THEN c.assigned_to_org_id WHEN c.status='draft' THEN c.org_id END;
  IF reviewer_org_id IS NULL OR NOT public.user_in_org(auth.uid(),reviewer_org_id)
    OR NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=reviewer_org_id AND o.type='TC') THEN
    RAISE EXCEPTION 'You are not authorized to change this order';
  END IF;
  UPDATE public.change_orders SET kept_internal=_internal,updated_at=now() WHERE id=_co_id RETURNING * INTO c;
  RETURN c;
END; $function$;

CREATE OR REPLACE FUNCTION public.return_crew_change_order_for_fix(_co_id uuid,_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.change_orders;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF NULLIF(btrim(COALESCE(_note,'')),'') IS NULL THEN RAISE EXCEPTION 'Explain what the crew needs to fix'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
  IF c.id IS NULL OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Change order not found' USING ERRCODE='42501'; END IF;
  IF c.created_by_role<>'FC' OR c.status<>'submitted' OR c.assigned_to_org_id IS NULL
    OR NOT public.user_in_org(auth.uid(),c.assigned_to_org_id)
    OR NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=c.assigned_to_org_id AND o.type='TC') THEN
    RAISE EXCEPTION 'Only the assigned subcontractor can return this crew order' USING ERRCODE='42501';
  END IF;
  UPDATE public.change_orders SET status='rejected',rejected_at=now(),rejection_note=btrim(_note),updated_at=now() WHERE id=c.id;
  PERFORM set_config('app.co_line_decision','on',true);
  UPDATE public.co_line_items SET approval_status='pending',approval_rejection_reason=NULL,approval_decided_by=NULL,approval_decided_at=NULL WHERE co_id=c.id;
END; $function$;

CREATE OR REPLACE FUNCTION public.forward_change_order_to_upstream_gc(_co_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE current_co public.change_orders; upstream_gc_org_id uuid; origin_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO current_co FROM public.change_orders WHERE id=_co_id;
  IF current_co.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
  IF current_co.status<>'submitted' THEN RAISE EXCEPTION 'Only submitted change orders can be forwarded'; END IF;
  IF current_co.created_by_role<>'FC' THEN RAISE EXCEPTION 'Only crew-originated change orders can be forwarded upstream'; END IF;
  IF current_co.assigned_to_org_id IS NULL OR NOT public.user_in_org(auth.uid(),current_co.assigned_to_org_id)
    OR NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=current_co.assigned_to_org_id AND o.type='TC') THEN
    RAISE EXCEPTION 'You are not authorized to forward this change order';
  END IF;
  IF current_co.crew_approved_at IS NULL THEN RAISE EXCEPTION 'Approve the crew work before forwarding it upstream'; END IF;
  IF current_co.kept_internal THEN RAISE EXCEPTION 'Internal-only work cannot be forwarded until you choose to bill it upstream'; END IF;
  SELECT pc.to_org_id INTO upstream_gc_org_id FROM public.project_contracts pc
  WHERE pc.project_id=current_co.project_id AND pc.from_org_id=current_co.assigned_to_org_id AND pc.to_role='General Contractor' AND pc.to_org_id IS NOT NULL
  ORDER BY pc.created_at DESC LIMIT 1;
  IF upstream_gc_org_id IS NULL THEN RAISE EXCEPTION 'No upstream general contractor organization found for this project'; END IF;
  origin_org_id:=COALESCE(current_co.originating_org_id,current_co.org_id);
  UPDATE public.change_orders SET org_id=current_co.assigned_to_org_id,assigned_to_org_id=upstream_gc_org_id,originating_org_id=origin_org_id,updated_at=now() WHERE id=_co_id;
  IF origin_org_id IS DISTINCT FROM current_co.assigned_to_org_id THEN
    INSERT INTO public.change_order_collaborators(co_id,organization_id,collaborator_type,status,completed_at)
    VALUES(_co_id,origin_org_id,'FC','completed',now()) ON CONFLICT DO NOTHING;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.track_co_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.change_orders; row_data jsonb; old_data jsonb; cid uuid; oid uuid; recipient uuid; changed boolean:=false;
BEGIN
 IF current_setting('app.skip_co_correction',true)='on' THEN RETURN NULL; END IF;
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 old_data:=CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
 cid:=CASE WHEN TG_TABLE_NAME='change_orders' THEN (row_data->>'id')::uuid ELSE (row_data->>'co_id')::uuid END;
 SELECT * INTO c FROM public.change_orders WHERE id=cid FOR UPDATE;
 IF c.id IS NULL OR c.status IN ('withdrawn','rejected','draft','shared') THEN RETURN NULL; END IF;
 IF c.kept_internal AND c.status IN ('work_in_progress','closed_for_pricing') THEN RETURN NULL; END IF;
 IF TG_TABLE_NAME='change_orders' AND (old_data->>'status') IN ('draft','shared') THEN RETURN NULL; END IF;
 oid:=(row_data->>'org_id')::uuid;
 IF TG_TABLE_NAME='change_orders' THEN
   SELECT u.organization_id INTO oid FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND (u.organization_id=c.org_id OR u.organization_id=c.assigned_to_org_id) ORDER BY (u.organization_id=c.org_id) DESC LIMIT 1;
   IF oid IS NULL THEN oid:=c.org_id; END IF;
   changed:=jsonb_build_array(row_data->'title',row_data->'reason',row_data->'reason_note',row_data->'location_tag',row_data->'pricing_type',row_data->'nte_cap',row_data->'materials_responsible',row_data->'equipment_responsible',row_data->'co_material_responsible_override',row_data->'co_equipment_responsible_override',row_data->'use_fc_pricing_base') IS DISTINCT FROM jsonb_build_array(old_data->'title',old_data->'reason',old_data->'reason_note',old_data->'location_tag',old_data->'pricing_type',old_data->'nte_cap',old_data->'materials_responsible',old_data->'equipment_responsible',old_data->'co_material_responsible_override',old_data->'co_equipment_responsible_override',old_data->'use_fc_pricing_base');
 ELSIF TG_TABLE_NAME='co_labor_entries' THEN
   IF COALESCE((row_data->>'is_actual_cost')::boolean,false) AND COALESCE((old_data->>'is_actual_cost')::boolean,true) THEN RETURN NULL; END IF;
   changed:=TG_OP<>'UPDATE' OR jsonb_build_array(row_data->'co_line_item_id',row_data->'description',row_data->'pricing_mode',row_data->'hours',row_data->'hourly_rate',row_data->'lump_sum',row_data->'line_total',row_data->'is_actual_cost',row_data->'crew_size',row_data->'days',row_data->'hours_per_day') IS DISTINCT FROM jsonb_build_array(old_data->'co_line_item_id',old_data->'description',old_data->'pricing_mode',old_data->'hours',old_data->'hourly_rate',old_data->'lump_sum',old_data->'line_total',old_data->'is_actual_cost',old_data->'crew_size',old_data->'days',old_data->'hours_per_day');
 ELSIF TG_TABLE_NAME='co_line_items' THEN
   changed:=TG_OP<>'UPDATE' OR (row_data-ARRAY['sort_order','created_at','ai_confidence','ai_reasoning']) IS DISTINCT FROM (old_data-ARRAY['sort_order','created_at','ai_confidence','ai_reasoning']);
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

CREATE OR REPLACE FUNCTION public.submit_co_correction(_co_id uuid,_from_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.change_orders; x public.co_corrections; rid uuid;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 SELECT * INTO x FROM public.co_corrections WHERE co_id=_co_id AND from_org_id=_from_org_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.can_see_project(c.project_id) OR NOT EXISTS(SELECT 1 FROM public.user_org_roles u LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=_from_org_id AND (u.is_admin OR COALESCE(p.can_create_work_orders,false))) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF x.co_id IS NULL OR x.version<=x.approved_version OR x.state='pending' OR c.status IN ('withdrawn','rejected') OR x.to_org_id IS NULL THEN RAISE EXCEPTION 'No correction ready to submit'; END IF;
 IF c.kept_internal AND c.status IN ('draft','shared','work_in_progress','closed_for_pricing') THEN RAISE EXCEPTION 'Internal order edits do not require upstream correction approval'; END IF;
 IF x.revision_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.co_price_revisions WHERE id=x.revision_id AND status='pending') THEN UPDATE public.co_corrections SET state='pending',submitted_version=version WHERE co_id=x.co_id AND from_org_id=x.from_org_id; UPDATE public.co_price_revisions SET status='rejected',decided_by=auth.uid(),decided_at=now() WHERE id=x.revision_id; END IF;
 IF c.org_id=x.from_org_id AND c.status IN ('approved','contracted') AND EXISTS(SELECT 1 FROM public.organizations WHERE id=x.from_org_id AND type='TC') THEN SELECT id INTO rid FROM public.submit_co_price_revision(c.id);
 ELSE INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by,event_key) VALUES(x.to_org_id,'CHANGE_SUBMITTED','Order correction needs approval',COALESCE(c.co_number,'Order')||': modified scope or billing needs your review','change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid(),'co-correction:'||c.id||':'||x.from_org_id||':'||x.version) ON CONFLICT DO NOTHING; END IF;
 UPDATE public.co_corrections SET state='pending',submitted_version=version,submitted_at=now(),revision_id=rid,scope_snapshot=COALESCE((SELECT jsonb_agg(jsonb_build_object('item',li.item_name,'description',li.description,'qty',li.qty,'unit',li.unit,'amount',COALESCE((SELECT sum(e.line_total) FROM public.co_labor_entries e WHERE e.co_line_item_id=li.id AND e.org_id=x.from_org_id AND NOT e.is_actual_cost),0)) ORDER BY li.sort_order) FROM public.co_line_items li WHERE li.co_id=c.id),'[]'::jsonb) WHERE co_id=x.co_id AND from_org_id=x.from_org_id;
END; $function$;