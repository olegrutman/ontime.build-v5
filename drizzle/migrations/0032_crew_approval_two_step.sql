ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS crew_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS crew_approved_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS kept_internal boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.approve_crew_change_order(_co_id uuid, _keep_internal boolean DEFAULT false)
RETURNS public.change_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.change_orders;
BEGIN
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;
  IF c.status <> 'submitted' OR c.created_by_role <> 'FC' THEN
    RAISE EXCEPTION 'Only submitted crew orders can be approved here';
  END IF;
  IF c.assigned_to_org_id IS NULL OR NOT public.user_in_org(auth.uid(), c.assigned_to_org_id) THEN
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
GRANT EXECUTE ON FUNCTION public.approve_crew_change_order(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_crew_change_order_internal(_co_id uuid, _internal boolean)
RETURNS public.change_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.change_orders;
BEGIN
  SELECT * INTO c FROM public.change_orders WHERE id = _co_id;
  IF c.id IS NULL OR c.crew_approved_at IS NULL OR c.status <> 'submitted' OR c.created_by_role <> 'FC' THEN
    RAISE EXCEPTION 'Only crew-approved orders not yet sent upstream can be changed';
  END IF;
  IF NOT public.user_in_org(auth.uid(), c.assigned_to_org_id) THEN
    RAISE EXCEPTION 'You are not authorized to change this order';
  END IF;
  UPDATE public.change_orders SET kept_internal = _internal, updated_at = now()
   WHERE id = _co_id RETURNING * INTO c;
  RETURN c;
END; $$;
GRANT EXECUTE ON FUNCTION public.set_crew_change_order_internal(uuid, boolean) TO authenticated;