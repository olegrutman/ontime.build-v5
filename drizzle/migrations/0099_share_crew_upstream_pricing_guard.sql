CREATE OR REPLACE FUNCTION public._assert_crew_upstream_pricing_ready(
  _co_id uuid,
  _upstream_biller_org_id uuid,
  _require_reviewed_crew_entries boolean
)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF _upstream_biller_org_id IS NULL THEN
    RAISE EXCEPTION 'Assign a subcontractor before sending this crew order upstream';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.co_line_items li WHERE li.co_id=_co_id) THEN
    RAISE EXCEPTION 'Add at least one scope item before sending this order upstream';
  END IF;
  IF _require_reviewed_crew_entries AND EXISTS(
    SELECT 1 FROM public.co_labor_entries e
    WHERE e.co_id=_co_id AND e.entered_by_role='FC' AND NOT e.is_actual_cost AND e.crew_review_status='pending'
  ) THEN
    RAISE EXCEPTION 'Review every crew time entry before sending this order upstream';
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.co_line_items li
    WHERE li.co_id=_co_id AND NOT EXISTS(
      SELECT 1 FROM public.co_labor_entries priced
      WHERE priced.co_line_item_id=li.id AND priced.org_id=_upstream_biller_org_id
        AND priced.entered_by_role='TC' AND NOT priced.is_actual_cost
        AND priced.line_total IS NOT NULL AND priced.line_total<>0
    )
  ) THEN
    RAISE EXCEPTION 'Confirm a non-zero price for every scope item before sending this order upstream';
  END IF;
END; $function$;

REVOKE ALL ON FUNCTION public._assert_crew_upstream_pricing_ready(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._assert_crew_upstream_pricing_ready(uuid,uuid,boolean) TO service_role;

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

  PERFORM public._assert_crew_upstream_pricing_ready(
    current_co.id,
    current_co.assigned_to_org_id,
    COALESCE(current_co.use_fc_pricing_base,false)
  );

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

REVOKE ALL ON FUNCTION public.forward_change_order_to_upstream_gc(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forward_change_order_to_upstream_gc(uuid) TO authenticated, service_role;