CREATE OR REPLACE FUNCTION public.approve_crew_change_order(_co_id uuid, _keep_internal boolean DEFAULT false)
RETURNS public.change_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.change_orders;
BEGIN
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
  IF c.created_by_role <> 'FC' THEN RAISE EXCEPTION 'Only crew orders can be approved here'; END IF;
  IF NOT (
    (c.status = 'submitted' AND c.assigned_to_org_id IS NOT NULL AND public.user_in_org(auth.uid(), c.assigned_to_org_id))
    OR (c.status = 'draft' AND public.user_in_org(auth.uid(), c.org_id))
  ) THEN
    RAISE EXCEPTION 'You are not authorized to approve this order';
  END IF;
  UPDATE public.change_orders
     SET crew_approved_at = COALESCE(crew_approved_at, now()),
         crew_approved_by_user_id = COALESCE(crew_approved_by_user_id, auth.uid()),
         kept_internal = COALESCE(_keep_internal, false),
         updated_at = now()
   WHERE id = _co_id RETURNING * INTO c;
  RETURN c;
END; $$;

CREATE OR REPLACE FUNCTION public.set_crew_change_order_internal(_co_id uuid, _internal boolean)
RETURNS public.change_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.change_orders;
BEGIN
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id;
  IF c.id IS NULL OR c.crew_approved_at IS NULL OR c.created_by_role <> 'FC' THEN
    RAISE EXCEPTION 'Only crew-approved orders can be changed';
  END IF;
  IF NOT (
    (c.status = 'submitted' AND public.user_in_org(auth.uid(), c.assigned_to_org_id))
    OR (c.status = 'draft' AND public.user_in_org(auth.uid(), c.org_id))
  ) THEN
    RAISE EXCEPTION 'You are not authorized to change this order';
  END IF;
  UPDATE public.change_orders SET kept_internal = _internal, updated_at = now()
   WHERE id = _co_id RETURNING * INTO c;
  RETURN c;
END; $$;