CREATE OR REPLACE FUNCTION public.forward_change_order_to_upstream_gc(_co_id uuid)
RETURNS public.change_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_co public.change_orders;
  upstream_gc_org_id uuid;
BEGIN
  SELECT *
  INTO current_co
  FROM public.change_orders
  WHERE id = _co_id;

  IF current_co.id IS NULL THEN
    RAISE EXCEPTION 'Change order not found';
  END IF;

  IF current_co.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted change orders can be forwarded';
  END IF;

  IF current_co.created_by_role <> 'FC' THEN
    RAISE EXCEPTION 'Only FC-originated change orders can be forwarded upstream';
  END IF;

  IF current_co.assigned_to_org_id IS NULL OR NOT public.user_in_org(auth.uid(), current_co.assigned_to_org_id) THEN
    RAISE EXCEPTION 'You are not authorized to forward this change order';
  END IF;

  SELECT pc.to_org_id
  INTO upstream_gc_org_id
  FROM public.project_contracts pc
  WHERE pc.project_id = current_co.project_id
    AND pc.from_org_id = current_co.assigned_to_org_id
    AND pc.to_role = 'General Contractor'
    AND pc.to_org_id IS NOT NULL
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF upstream_gc_org_id IS NULL THEN
    RAISE EXCEPTION 'No upstream GC organization found for this project';
  END IF;

  UPDATE public.change_orders
  SET org_id = current_co.assigned_to_org_id,
      assigned_to_org_id = upstream_gc_org_id,
      updated_at = now()
  WHERE id = _co_id
  RETURNING * INTO current_co;

  RETURN current_co;
END;
$$;

GRANT EXECUTE ON FUNCTION public.forward_change_order_to_upstream_gc(uuid) TO authenticated;