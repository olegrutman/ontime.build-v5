ALTER TABLE public.co_line_items ADD COLUMN completed_at timestamptz, ADD COLUMN completed_by_user_id uuid;
COMMENT ON COLUMN public.co_line_items.completed_at IS 'Physical completion of this scope item; approval and invoice reservations remain separate.';
CREATE OR REPLACE FUNCTION public.guard_co_item_completion() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
 IF (TG_OP = 'INSERT' AND (NEW.completed_at IS NOT NULL OR NEW.completed_by_user_id IS NOT NULL)) OR (TG_OP = 'UPDATE' AND (NEW.completed_at IS DISTINCT FROM OLD.completed_at OR NEW.completed_by_user_id IS DISTINCT FROM OLD.completed_by_user_id)) THEN
 IF current_setting('app.co_item_completion',true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'Use the authorized item completion action' USING errcode='42501'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_co_item_completion BEFORE INSERT OR UPDATE ON public.co_line_items FOR EACH ROW EXECUTE FUNCTION public.guard_co_item_completion();
CREATE OR REPLACE FUNCTION public.complete_co_item(_item_id uuid) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE li public.co_line_items; c public.change_orders; actor_role text; stamp timestamptz; prev_skip text;
BEGIN
 SELECT * INTO li FROM public.co_line_items WHERE id=_item_id FOR UPDATE;
 SELECT * INTO c FROM public.change_orders WHERE id=li.co_id FOR UPDATE;
 IF auth.uid() IS NULL OR c.id IS NULL OR NOT public.can_see_project(c.project_id) OR c.status NOT IN ('approved','contracted') OR li.approval_status <> 'approved' THEN RAISE EXCEPTION 'Only approved scope on an approved order can be completed' USING errcode='42501'; END IF;
 SELECT o.type::text INTO actor_role FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id
 WHERE u.user_id=auth.uid() AND (u.is_admin OR coalesce(p.can_create_work_orders,false) OR coalesce(p.can_submit_time,false)) AND (
 (o.type='TC' AND u.organization_id IN (c.org_id,c.assigned_to_org_id)) OR
 (o.type='FC' AND (u.organization_id=li.org_id OR EXISTS(SELECT 1 FROM public.co_labor_entries e WHERE e.co_line_item_id=li.id AND e.org_id=u.organization_id AND NOT e.is_actual_cost)) AND (u.organization_id IN (c.org_id,c.originating_org_id) OR EXISTS(SELECT 1 FROM public.change_order_collaborators cc WHERE cc.co_id=c.id AND cc.organization_id=u.organization_id AND cc.status IN ('active','completed'))))) LIMIT 1;
 IF actor_role IS NULL THEN RAISE EXCEPTION 'Only the authorized performing company can complete this item' USING errcode='42501'; END IF;
 IF li.completed_at IS NOT NULL THEN RETURN li.completed_at; END IF;
 stamp:=now(); prev_skip:=current_setting('app.skip_co_correction',true);
 PERFORM set_config('app.skip_co_correction','on',true); PERFORM set_config('app.co_item_completion','on',true);
 UPDATE public.co_line_items SET completed_at=stamp,completed_by_user_id=auth.uid() WHERE id=li.id;
 PERFORM set_config('app.co_item_completion','off',true); PERFORM set_config('app.skip_co_correction',coalesce(prev_skip,'off'),true);
 INSERT INTO public.co_activity(co_id,project_id,actor_user_id,actor_role,action,detail) VALUES(c.id,c.project_id,auth.uid(),actor_role,'item_completed',li.item_name);
 RETURN stamp;
END $$;
REVOKE ALL ON FUNCTION public.complete_co_item(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_co_item(uuid) TO authenticated;
CREATE OR REPLACE VIEW public.co_line_items_role_view WITH (security_invoker=true) AS SELECT id,co_id,org_id,created_by_role,catalog_item_id,item_name,division,category_name,unit,qty,sort_order,created_at,location_tag,reason,description,quantity_source,ai_confidence,ai_reasoning,task_index,pricing_mode,task_phase,pricing_type,CASE WHEN public.co_viewer_role(co_id)=ANY(ARRAY['gc','tc']) THEN nte_cap ELSE NULL::numeric END AS nte_cap,source,scenario_id,group_key,approval_status,approval_rejection_reason,approval_decided_by,approval_decided_at,completed_at,completed_by_user_id FROM public.co_line_items;
