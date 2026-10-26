CREATE OR REPLACE FUNCTION public.apply_accepted_co_price_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; old_total numeric; new_total numeric; contract_id uuid;
BEGIN
 IF OLD.status <> 'pending' OR NEW.status <> 'approved' THEN RETURN NEW; END IF;
 SELECT * INTO c FROM public.change_orders WHERE id=NEW.co_id FOR UPDATE;
 IF auth.uid() IS NULL OR NEW.decided_by IS DISTINCT FROM auth.uid() OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=NEW.to_org_id AND o.type='GC' AND (u.is_admin OR COALESCE(p.can_approve_invoices,false))) THEN RAISE EXCEPTION 'Only the assigned contractor may decide this revision'; END IF;
 IF c.status NOT IN ('approved','contracted') OR c.assigned_to_org_id IS DISTINCT FROM NEW.to_org_id OR c.org_id IS DISTINCT FROM NEW.from_org_id OR COALESCE(c.tc_submitted_price,0)<>NEW.previous_price THEN RAISE EXCEPTION 'Order changed since this revision was submitted'; END IF;
 IF c.pricing_type='nte' AND c.nte_cap>0 AND NEW.proposed_total>c.nte_cap THEN RAISE EXCEPTION 'Revision exceeds not-to-exceed cap'; END IF;
 old_total:=public.co_grand_total(c.id);
 contract_id:=public._co_target_contract_id(c.project_id,c.org_id,c.assigned_to_org_id);
 IF contract_id IS NULL THEN RAISE EXCEPTION 'No contract found for this order'; END IF;
 UPDATE public.change_orders SET tc_submitted_price=NEW.proposed_price,updated_at=now() WHERE id=c.id;
 new_total:=public.co_grand_total(c.id);
 UPDATE public.project_contracts SET contract_sum=COALESCE(contract_sum,0)+(new_total-old_total),co_approved_sum=COALESCE(co_approved_sum,0)+(new_total-old_total),updated_at=now() WHERE id=contract_id;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.apply_accepted_co_price_revision() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER apply_accepted_price_revision AFTER UPDATE OF status ON public.co_price_revisions FOR EACH ROW WHEN (OLD.status='pending' AND NEW.status='approved') EXECUTE FUNCTION public.apply_accepted_co_price_revision();
CREATE OR REPLACE FUNCTION public.decide_co_price_revision(_revision_id uuid,_approve boolean) RETURNS public.co_price_revisions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.change_orders; r public.co_price_revisions;
BEGIN
 SELECT co.* INTO c FROM public.change_orders co JOIN public.co_price_revisions rev ON rev.co_id=co.id WHERE rev.id=_revision_id FOR UPDATE OF co;
 SELECT * INTO r FROM public.co_price_revisions WHERE id=_revision_id FOR UPDATE;
 IF auth.uid() IS NULL OR r.id IS NULL OR NOT public.can_see_project(c.project_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.user_org_roles u JOIN public.organizations o ON o.id=u.organization_id LEFT JOIN public.member_permissions p ON p.user_org_role_id=u.id WHERE u.user_id=auth.uid() AND u.organization_id=r.to_org_id AND o.type='GC' AND (u.is_admin OR COALESCE(p.can_approve_invoices,false))) THEN RAISE EXCEPTION 'Only the assigned contractor may decide this revision'; END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'Revision already decided'; END IF;
 IF c.status NOT IN ('approved','contracted') OR c.assigned_to_org_id IS DISTINCT FROM r.to_org_id OR c.org_id IS DISTINCT FROM r.from_org_id OR COALESCE(c.tc_submitted_price,0)<>r.previous_price THEN RAISE EXCEPTION 'Order changed since this revision was submitted'; END IF;
 UPDATE public.co_price_revisions SET status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,decided_by=auth.uid(),decided_at=now() WHERE id=r.id RETURNING * INTO r;
 INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by) VALUES(r.from_org_id,CASE WHEN _approve THEN 'CHANGE_APPROVED'::public.notification_type ELSE 'CHANGE_REJECTED'::public.notification_type END,CASE WHEN _approve THEN 'Revised price approved' ELSE 'Revised price rejected' END,COALESCE(c.co_number,'Order'),'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
 RETURN r;
END; $$;
REVOKE ALL ON FUNCTION public.decide_co_price_revision(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_co_price_revision(uuid,boolean) TO authenticated;