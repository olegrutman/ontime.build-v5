CREATE TABLE public.co_corrections (
 co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE, from_org_id uuid NOT NULL REFERENCES public.organizations(id), to_org_id uuid REFERENCES public.organizations(id), project_id uuid NOT NULL REFERENCES public.projects(id), version integer NOT NULL DEFAULT 1, approved_version integer NOT NULL DEFAULT 0, submitted_version integer, state text NOT NULL DEFAULT 'needs_correction' CHECK(state IN ('needs_correction','pending','clean')), changed_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz, decided_at timestamptz, changed_by uuid, revision_id uuid REFERENCES public.co_price_revisions(id), PRIMARY KEY(co_id,from_org_id)
);
GRANT SELECT ON public.co_corrections TO authenticated;
GRANT ALL ON public.co_corrections TO service_role;
ALTER TABLE public.co_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Correction contractual parties" ON public.co_corrections FOR SELECT TO authenticated USING(public.can_see_project(project_id) AND (public.user_in_org(auth.uid(),from_org_id) OR (state='pending' AND public.user_in_org(auth.uid(),to_org_id))));
CREATE OR REPLACE FUNCTION public.track_co_correction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; row_data jsonb; old_data jsonb; cid uuid; oid uuid; recipient uuid; changed boolean:=false;
BEGIN
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
END; $$;
REVOKE ALL ON FUNCTION public.track_co_correction() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER track_order_header_correction AFTER UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.track_co_correction();
CREATE TRIGGER track_order_scope_correction AFTER INSERT OR UPDATE OR DELETE ON public.co_line_items FOR EACH ROW EXECUTE FUNCTION public.track_co_correction();
CREATE TRIGGER track_order_labor_correction AFTER INSERT OR UPDATE OR DELETE ON public.co_labor_entries FOR EACH ROW EXECUTE FUNCTION public.track_co_correction();
CREATE TRIGGER track_order_material_correction AFTER INSERT OR UPDATE OR DELETE ON public.co_material_items FOR EACH ROW EXECUTE FUNCTION public.track_co_correction();
CREATE TRIGGER track_order_equipment_correction AFTER INSERT OR UPDATE OR DELETE ON public.co_equipment_items FOR EACH ROW EXECUTE FUNCTION public.track_co_correction();
CREATE OR REPLACE FUNCTION public.submit_co_correction(_co_id uuid,_from_org_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; x public.co_corrections; rid uuid;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 SELECT * INTO x FROM public.co_corrections WHERE co_id=_co_id AND from_org_id=_from_org_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.can_see_project(c.project_id) OR NOT EXISTS(SELECT 1 FROM public.user_org_roles u LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=_from_org_id AND (u.is_admin OR COALESCE(p.can_create_work_orders,false))) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF x.co_id IS NULL OR x.version<=x.approved_version OR x.state='pending' OR c.status IN ('withdrawn','rejected') OR x.to_org_id IS NULL THEN RAISE EXCEPTION 'No correction ready to submit'; END IF;
 IF c.org_id=x.from_org_id AND c.status IN ('approved','contracted') AND EXISTS(SELECT 1 FROM public.organizations WHERE id=x.from_org_id AND type='TC') THEN
   SELECT id INTO rid FROM public.submit_co_price_revision(c.id);
 ELSE
   INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by,event_key) VALUES(x.to_org_id,'CHANGE_SUBMITTED','Order correction needs approval',COALESCE(c.co_number,'Order')||': modified scope or billing needs your review','change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid(),'co-correction:'||c.id||':'||x.from_org_id||':'||x.version) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.co_corrections SET state='pending',submitted_version=version,submitted_at=now(),revision_id=rid WHERE co_id=x.co_id AND from_org_id=x.from_org_id;
END; $$;
REVOKE ALL ON FUNCTION public.submit_co_correction(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_co_correction(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.decide_co_correction(_co_id uuid,_from_org_id uuid,_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; x public.co_corrections;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 SELECT * INTO x FROM public.co_corrections WHERE co_id=_co_id AND from_org_id=_from_org_id FOR UPDATE;
 IF auth.uid() IS NULL OR NOT public.can_see_project(c.project_id) OR NOT EXISTS(SELECT 1 FROM public.user_org_roles u LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=x.to_org_id AND (u.is_admin OR COALESCE(p.can_approve_invoices,false))) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF x.state<>'pending' OR x.submitted_version IS DISTINCT FROM x.version OR c.status IN ('withdrawn','rejected') THEN RAISE EXCEPTION 'Correction changed; submit the latest version before approval'; END IF;
 IF x.revision_id IS NOT NULL THEN PERFORM public.decide_co_price_revision(x.revision_id,_approve);
 ELSE
 UPDATE public.co_corrections SET state=CASE WHEN _approve THEN 'clean' ELSE 'needs_correction' END,approved_version=CASE WHEN _approve THEN version ELSE approved_version END,decided_at=now() WHERE co_id=x.co_id AND from_org_id=x.from_org_id;
 INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by) VALUES(x.from_org_id,CASE WHEN _approve THEN 'CHANGE_APPROVED'::public.notification_type ELSE 'CHANGE_REJECTED'::public.notification_type END,CASE WHEN _approve THEN 'Order correction approved' ELSE 'Order correction returned' END,COALESCE(c.co_number,'Order'),'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.decide_co_correction(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_co_correction(uuid,uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_correction_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE x public.co_corrections;
BEGIN
 IF TG_OP='UPDATE' AND OLD.status='pending' AND NEW.status IN ('approved','rejected') THEN
 SELECT * INTO x FROM public.co_corrections WHERE revision_id=NEW.id FOR UPDATE;
 IF x.co_id IS NOT NULL AND (x.version IS DISTINCT FROM x.submitted_version OR x.state<>'pending') THEN RAISE EXCEPTION 'Correction changed; submit the latest version before approval'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_correction_revision() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER a_guard_correction_revision BEFORE UPDATE OF status ON public.co_price_revisions FOR EACH ROW EXECUTE FUNCTION public.guard_correction_revision();
CREATE OR REPLACE FUNCTION public.sync_correction_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
 UPDATE public.co_corrections SET state='pending',submitted_version=version,submitted_at=now(),revision_id=NEW.id WHERE co_id=NEW.co_id AND from_org_id=NEW.from_org_id;
 ELSIF OLD.status='pending' AND NEW.status IN ('approved','rejected') THEN
 UPDATE public.co_corrections SET state=CASE WHEN NEW.status='approved' THEN 'clean' ELSE 'needs_correction' END,approved_version=CASE WHEN NEW.status='approved' THEN submitted_version ELSE approved_version END,decided_at=now() WHERE revision_id=NEW.id;
 END IF;
 RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_correction_revision() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER z_sync_correction_revision AFTER INSERT OR UPDATE OF status ON public.co_price_revisions FOR EACH ROW EXECUTE FUNCTION public.sync_correction_revision();
DO $$ DECLARE fn text; BEGIN
 SELECT pg_get_functiondef('public.submit_co_price_revision(uuid)'::regprocedure) INTO fn;
 fn:=replace(fn,'IF proposal<=0 OR proposal=COALESCE(c.tc_submitted_price,0) THEN','IF proposal<0 OR (proposal=COALESCE(c.tc_submitted_price,0) AND NOT EXISTS(SELECT 1 FROM public.co_corrections x WHERE x.co_id=c.id AND x.from_org_id=c.org_id AND x.version>x.approved_version)) THEN');
 EXECUTE fn;
END; $$;
INSERT INTO public.co_corrections(co_id,from_org_id,to_org_id,project_id)
SELECT c.id,c.org_id,c.assigned_to_org_id,c.project_id FROM public.change_orders c JOIN public.organizations o ON o.id=c.org_id AND o.type='TC' WHERE c.status IN ('approved','contracted') AND NOT COALESCE(c.kept_internal,false) AND c.tc_submitted_price IS NOT NULL AND ABS(COALESCE((SELECT sum(e.line_total) FROM public.co_labor_entries e WHERE e.co_id=c.id AND e.org_id=c.org_id AND e.entered_by_role='TC' AND NOT e.is_actual_cost),0)-c.tc_submitted_price)>=0.01 AND NOT EXISTS(SELECT 1 FROM public.co_price_revisions r WHERE r.co_id=c.id AND r.status='pending') ON CONFLICT DO NOTHING;
COMMENT ON TABLE public.co_corrections IS 'Party-private automatic scope/billable correction versions; original lifecycle approval is preserved. Private actual costs are excluded.';