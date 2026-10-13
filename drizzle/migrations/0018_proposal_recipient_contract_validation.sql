ALTER TABLE public.co_proposals ADD COLUMN recipient_org_id uuid REFERENCES public.organizations(id);
CREATE OR REPLACE FUNCTION public.validate_proposal_recipient() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE issuer_type public.org_type; recipients jsonb;
BEGIN
 SELECT type INTO issuer_type FROM public.organizations WHERE id=NEW.org_id;
 IF NEW.recipient_org_id IS NOT NULL THEN
 IF issuer_type='GC' THEN RAISE EXCEPTION 'General contractor proposals are addressed to the owner'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.project_contracts c WHERE c.project_id=NEW.project_id AND c.from_org_id=NEW.org_id AND c.to_org_id=NEW.recipient_org_id AND c.status IS DISTINCT FROM 'rejected') AND NOT EXISTS(SELECT 1 FROM public.project_relationships r JOIN public.project_participants d ON d.id=r.downstream_participant_id JOIN public.project_participants u ON u.id=r.upstream_participant_id WHERE r.project_id=NEW.project_id AND d.organization_id=NEW.org_id AND u.organization_id=NEW.recipient_org_id AND d.invite_status='ACCEPTED' AND u.invite_status='ACCEPTED') THEN RAISE EXCEPTION 'Recipient must be the contractual payer'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_proposal_recipient BEFORE INSERT OR UPDATE ON public.co_proposals FOR EACH ROW EXECUTE FUNCTION public.validate_proposal_recipient();
CREATE OR REPLACE FUNCTION public.validate_proposal_work_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.co_proposals%ROWTYPE; co public.change_orders%ROWTYPE;
BEGIN
 SELECT * INTO p FROM public.co_proposals WHERE id=NEW.proposal_id;
 SELECT * INTO co FROM public.change_orders WHERE id=NEW.change_order_id;
 IF co.project_id IS DISTINCT FROM p.project_id THEN RAISE EXCEPTION 'Work order must belong to the proposal project'; END IF;
 IF p.recipient_org_id IS NOT NULL AND co.org_id=p.org_id AND co.assigned_to_org_id IS NOT NULL AND co.assigned_to_org_id<>p.recipient_org_id THEN RAISE EXCEPTION 'Work orders for different paying companies cannot be combined'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_proposal_work_order BEFORE INSERT OR UPDATE ON public.co_proposal_items FOR EACH ROW EXECUTE FUNCTION public.validate_proposal_work_order();