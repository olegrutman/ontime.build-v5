CREATE TABLE public.co_pricing_type_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  from_org_id uuid NOT NULL,
  to_org_id uuid NOT NULL,
  from_type text NOT NULL,
  to_type text NOT NULL CHECK (to_type IN ('fixed','tm','nte')),
  nte_cap numeric,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','cancelled')),
  requested_by uuid NOT NULL,
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX co_pricing_type_requests_one_pending ON public.co_pricing_type_requests(co_id) WHERE status='pending';
GRANT SELECT ON public.co_pricing_type_requests TO authenticated;
GRANT ALL ON public.co_pricing_type_requests TO service_role;
ALTER TABLE public.co_pricing_type_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order parties read pricing type requests" ON public.co_pricing_type_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND u.organization_id IN (from_org_id,to_org_id)));

CREATE OR REPLACE FUNCTION public._co_pricing_change_block(c public.change_orders)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN c.status IN ('withdrawn','rejected') THEN 'This order is withdrawn or rejected.'
    WHEN c.completed_at IS NOT NULL THEN 'This order is closed out.'
    WHEN EXISTS (SELECT 1 FROM public.invoice_line_items l JOIN public.invoices i ON i.id=l.invoice_id
                 WHERE l.source_co_id=c.id AND upper(i.status::text)<>'REJECTED') THEN 'This order has already been invoiced.'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.change_co_pricing_type(_co_id uuid, _to_type text, _nte_cap numeric DEFAULT NULL, _reason text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.change_orders; my_org uuid; other_org uuid; blk text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _to_type NOT IN ('fixed','tm','nte') THEN RAISE EXCEPTION 'Unknown pricing type'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT organization_id INTO my_org FROM public.user_org_roles WHERE user_id=auth.uid() AND organization_id=c.org_id LIMIT 1;
  IF my_org IS NULL THEN RAISE EXCEPTION 'Only the company that created this order can change its pricing type'; END IF;
  IF c.pricing_type=_to_type AND (_to_type<>'nte' OR c.nte_cap IS NOT DISTINCT FROM _nte_cap) THEN RAISE EXCEPTION 'The order already uses this pricing type'; END IF;
  IF _to_type='nte' AND (_nte_cap IS NULL OR _nte_cap<=0) THEN RAISE EXCEPTION 'Enter a Not-to-exceed ceiling greater than zero'; END IF;
  blk := public._co_pricing_change_block(c);
  IF blk IS NOT NULL THEN RAISE EXCEPTION 'Pricing type can''t be changed: %', blk; END IF;

  IF c.status NOT IN ('submitted','approved','contracted') THEN
    PERFORM set_config('app.skip_co_correction','on',true);
    UPDATE public.change_orders SET pricing_type=_to_type,
      nte_cap=CASE WHEN _to_type='nte' THEN _nte_cap ELSE nte_cap END, updated_at=now() WHERE id=c.id;
    PERFORM set_config('app.skip_co_correction','off',true);
    INSERT INTO public.co_activity(co_id, project_id, actor_user_id, actor_role, action, detail)
      SELECT c.id, c.project_id, auth.uid(), COALESCE(c.created_by_role,'TC'), 'pricing_type_changed', c.pricing_type||' → '||_to_type
      WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='co_activity' AND column_name='detail');
    RETURN 'applied';
  END IF;

  other_org := COALESCE(NULLIF(c.assigned_to_org_id, c.org_id), NULL);
  IF other_org IS NULL THEN RAISE EXCEPTION 'No other company is assigned to approve this change'; END IF;
  IF EXISTS (SELECT 1 FROM public.co_pricing_type_requests WHERE co_id=c.id AND status='pending') THEN
    RAISE EXCEPTION 'A pricing type change is already waiting for approval';
  END IF;
  INSERT INTO public.co_pricing_type_requests(co_id,project_id,from_org_id,to_org_id,from_type,to_type,nte_cap,reason,requested_by)
  VALUES (c.id,c.project_id,my_org,other_org,c.pricing_type,_to_type,CASE WHEN _to_type='nte' THEN _nte_cap END,NULLIF(trim(_reason),''),auth.uid());
  INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by)
  VALUES (other_org,'CHANGE_SUBMITTED','Pricing type change requested',COALESCE(c.co_number,'Order'),'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
  RETURN 'requested';
END $$;

CREATE OR REPLACE FUNCTION public.decide_co_pricing_type_request(_request_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.co_pricing_type_requests; c public.change_orders; blk text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.co_pricing_type_requests WHERE id=_request_id FOR UPDATE;
  IF r.id IS NULL OR r.status<>'pending' THEN RAISE EXCEPTION 'This request was already decided'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id=auth.uid() AND organization_id=r.from_org_id) THEN
    IF _approve THEN RAISE EXCEPTION 'The other company must approve this change'; END IF;
    UPDATE public.co_pricing_type_requests SET status='cancelled', decided_by=auth.uid(), decided_at=now() WHERE id=r.id;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id=auth.uid() AND organization_id=r.to_org_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT _approve AND NULLIF(trim(COALESCE(_note,'')),'') IS NULL THEN RAISE EXCEPTION 'Add a reason for declining'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id=r.co_id FOR UPDATE;
  IF _approve THEN
    blk := public._co_pricing_change_block(c);
    IF blk IS NOT NULL THEN RAISE EXCEPTION 'Pricing type can''t be changed: %', blk; END IF;
    PERFORM set_config('app.skip_co_correction','on',true);
    UPDATE public.change_orders SET pricing_type=r.to_type,
      nte_cap=CASE WHEN r.to_type='nte' THEN r.nte_cap ELSE nte_cap END, updated_at=now() WHERE id=c.id;
    PERFORM set_config('app.skip_co_correction','off',true);
  END IF;
  UPDATE public.co_pricing_type_requests SET status=CASE WHEN _approve THEN 'approved' ELSE 'declined' END,
    decided_by=auth.uid(), decided_at=now(), decision_note=NULLIF(trim(COALESCE(_note,'')),'') WHERE id=r.id;
  INSERT INTO public.notifications(recipient_org_id,type,title,body,entity_type,entity_id,action_url,created_by)
  VALUES (r.from_org_id, CASE WHEN _approve THEN 'CHANGE_APPROVED'::public.notification_type ELSE 'CHANGE_REJECTED'::public.notification_type END,
    CASE WHEN _approve THEN 'Pricing type change approved' ELSE 'Pricing type change declined' END,
    COALESCE(c.co_number,'Order'),'change_order',c.id,'/project/'||c.project_id||'/change-orders/'||c.id,auth.uid());
END $$;

REVOKE ALL ON FUNCTION public.change_co_pricing_type(uuid,text,numeric,text) FROM public, anon;
REVOKE ALL ON FUNCTION public.decide_co_pricing_type_request(uuid,boolean,text) FROM public, anon;
REVOKE ALL ON FUNCTION public._co_pricing_change_block(public.change_orders) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_co_pricing_type(uuid,text,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_co_pricing_type_request(uuid,boolean,text) TO authenticated;