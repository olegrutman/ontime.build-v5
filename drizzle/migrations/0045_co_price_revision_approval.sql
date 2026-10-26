CREATE TABLE public.co_price_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
 from_org_id uuid NOT NULL REFERENCES public.organizations(id), to_org_id uuid NOT NULL REFERENCES public.organizations(id),
 previous_price numeric NOT NULL, proposed_price numeric NOT NULL, proposed_total numeric NOT NULL,
 scope_snapshot jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 submitted_by uuid NOT NULL, submitted_at timestamptz NOT NULL DEFAULT now(), decided_by uuid, decided_at timestamptz
);
GRANT SELECT ON public.co_price_revisions TO authenticated;
GRANT ALL ON public.co_price_revisions TO service_role;
ALTER TABLE public.co_price_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Revision parties can read" ON public.co_price_revisions FOR SELECT TO authenticated USING (
 public.can_see_project((SELECT project_id FROM public.change_orders WHERE id=co_id)) AND (public.user_in_org(auth.uid(),from_org_id) OR public.user_in_org(auth.uid(),to_org_id))
);
CREATE UNIQUE INDEX co_one_pending_price_revision ON public.co_price_revisions(co_id) WHERE status='pending';
CREATE OR REPLACE FUNCTION public.submit_co_price_revision(_co_id uuid) RETURNS public.co_price_revisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; r public.co_price_revisions; labor numeric; mats numeric:=0; eq numeric:=0; proposal numeric; total numeric; scope jsonb;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 IF auth.uid() IS NULL OR c.id IS NULL OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=c.org_id AND o.type='TC' AND (u.is_admin OR COALESCE(p.can_create_work_orders,false))) THEN RAISE EXCEPTION 'Only the submitting company can request a price revision'; END IF;
 IF c.status NOT IN ('approved','contracted') OR c.approved_at IS NULL THEN RAISE EXCEPTION 'Price revisions require an approved order'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id=c.assigned_to_org_id AND type='GC') THEN RAISE EXCEPTION 'No general contractor assigned'; END IF;
 SELECT COALESCE(sum(line_total),0) INTO labor FROM public.co_labor_entries WHERE co_id=c.id AND org_id=c.org_id AND entered_by_role='TC' AND NOT is_actual_cost;
 IF COALESCE(c.co_material_responsible_override,c.materials_responsible,'TC') <> 'GC' THEN SELECT COALESCE(sum(billed_amount),0) INTO mats FROM public.co_material_items WHERE co_id=c.id AND org_id=c.org_id; END IF;
 IF COALESCE(c.co_equipment_responsible_override,c.equipment_responsible,'TC') <> 'GC' THEN SELECT COALESCE(sum(billed_amount),0) INTO eq FROM public.co_equipment_items WHERE co_id=c.id AND org_id=c.org_id; END IF;
 proposal:=round(CASE WHEN c.use_fc_pricing_base THEN labor ELSE labor+mats+eq END,2); total:=round(labor+mats+eq,2);
 IF proposal<=0 OR proposal=COALESCE(c.tc_submitted_price,0) THEN RAISE EXCEPTION 'No changed billable price to submit'; END IF;
 IF c.pricing_type='nte' AND c.nte_cap>0 AND total>c.nte_cap THEN RAISE EXCEPTION 'Approve a higher not-to-exceed cap first'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('item',li.item_name,'description',li.description,'amount',e.amount) ORDER BY li.sort_order),'[]') INTO scope FROM public.co_line_items li JOIN (SELECT co_line_item_id,sum(line_total) amount FROM public.co_labor_entries WHERE co_id=c.id AND org_id=c.org_id AND entered_by_role='TC' AND NOT is_actual_cost GROUP BY co_line_item_id) e ON e.co_line_item_id=li.id WHERE li.co_id=c.id;
 INSERT INTO public.co_price_revisions(co_id,from_org_id,to_org_id,previous_price,proposed_price,proposed_total,scope_snapshot,submitted_by) VALUES(c.id,c.org_id,c.assigned_to_org_id,COALESCE(c.tc_submitted_price,0),proposal,total,scope,auth.uid()) RETURNING * INTO r;
 INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by) VALUES(c.assigned_to_org_id,'CHANGE_SUBMITTED','Revised price needs approval',COALESCE(c.co_number,'Order')||': revised price '||proposal,'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.submit_co_price_revision(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_co_price_revision(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.decide_co_price_revision(_revision_id uuid,_approve boolean) RETURNS public.co_price_revisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; r public.co_price_revisions; old_total numeric; new_total numeric; contract_id uuid;
BEGIN
 SELECT co.* INTO c FROM public.change_orders co JOIN public.co_price_revisions rev ON rev.co_id=co.id WHERE rev.id=_revision_id FOR UPDATE OF co;
 SELECT * INTO r FROM public.co_price_revisions WHERE id=_revision_id FOR UPDATE;
 IF auth.uid() IS NULL OR r.id IS NULL OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=r.to_org_id AND o.type='GC' AND (u.is_admin OR COALESCE(p.can_approve_invoices,false))) THEN RAISE EXCEPTION 'Only the assigned contractor may decide this revision'; END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Revision already decided'; END IF;
 IF c.status NOT IN ('approved','contracted') OR c.assigned_to_org_id<>r.to_org_id OR c.org_id<>r.from_org_id OR COALESCE(c.tc_submitted_price,0)<>r.previous_price THEN RAISE EXCEPTION 'Order changed since this revision was submitted'; END IF;
 IF _approve THEN
  IF c.pricing_type='nte' AND c.nte_cap>0 AND r.proposed_total>c.nte_cap THEN RAISE EXCEPTION 'Revision exceeds not-to-exceed cap'; END IF;
  old_total:=public.co_grand_total(c.id);
  contract_id:=public._co_target_contract_id(c.project_id,c.org_id,c.assigned_to_org_id);
  IF contract_id IS NULL THEN RAISE EXCEPTION 'No contract found for this order'; END IF;
  UPDATE public.change_orders SET tc_submitted_price=r.proposed_price,updated_at=now() WHERE id=c.id;
  new_total:=public.co_grand_total(c.id);
  UPDATE public.project_contracts SET contract_sum=COALESCE(contract_sum,0)+(new_total-old_total),co_approved_sum=COALESCE(co_approved_sum,0)+(new_total-old_total),updated_at=now() WHERE id=contract_id;
 END IF;
 UPDATE public.co_price_revisions SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,decided_by=auth.uid(),decided_at=now() WHERE id=r.id RETURNING * INTO r;
 INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by) VALUES(r.from_org_id,CASE WHEN _approve THEN 'CHANGE_APPROVED'::public.notification_type ELSE 'CHANGE_REJECTED'::public.notification_type END,CASE WHEN _approve THEN 'Revised price approved' ELSE 'Revised price rejected' END,COALESCE(c.co_number,'Order'),'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.decide_co_price_revision(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_co_price_revision(uuid,boolean) TO authenticated;