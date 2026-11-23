CREATE OR REPLACE FUNCTION public.set_co_item_labor_pricing_method(
  _item_id uuid,
  _method text,
  _org_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  li public.co_line_items;
  c public.change_orders;
  biller uuid;
BEGIN
  IF auth.uid() IS NULL OR _org_id IS NULL OR _method IS NULL OR _method NOT IN ('crew','manual') THEN
    RAISE EXCEPTION 'Item, organization and a valid pricing method are required';
  END IF;

  SELECT * INTO li FROM public.co_line_items WHERE id=_item_id FOR UPDATE;
  IF li.id IS NULL THEN RAISE EXCEPTION 'Scope item not found'; END IF;
  SELECT * INTO c FROM public.change_orders WHERE id=li.co_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Change order not found'; END IF;

  biller := CASE
    WHEN c.created_by_role='FC'
      AND (c.originating_org_id IS NULL OR c.originating_org_id=c.org_id)
      AND c.assigned_to_org_id IS NOT NULL AND c.assigned_to_org_id<>c.org_id
    THEN c.assigned_to_org_id ELSE c.org_id END;

  IF biller<>_org_id
    OR NOT public.user_in_org(auth.uid(),_org_id)
    OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=_org_id AND type='TC')
    OR NOT public.is_project_participant(auth.uid(),c.project_id) THEN
    RAISE EXCEPTION 'Not authorized to change this item pricing method';
  END IF;

  IF c.status NOT IN ('draft','shared','work_in_progress','closed_for_pricing')
    AND NOT (c.status='submitted' AND c.created_by_role='FC' AND c.assigned_to_org_id=_org_id
      AND (c.originating_org_id IS NULL OR c.originating_org_id=c.org_id)) THEN
    RAISE EXCEPTION 'Recall the upstream submission before changing billing';
  END IF;

  IF _method='crew' AND EXISTS(
    SELECT 1 FROM public.co_labor_entries e
    WHERE e.co_line_item_id=li.id AND e.org_id=_org_id AND e.entered_by_role='TC'
      AND NOT e.is_actual_cost AND NOT e.crew_pricing_derived
  ) THEN
    RAISE EXCEPTION 'Remove this item''s manual billing entries before using crew hours';
  END IF;

  IF _method='manual' THEN
    DELETE FROM public.co_labor_entries
    WHERE co_line_item_id=li.id AND org_id=_org_id AND entered_by_role='TC' AND crew_pricing_derived;
  END IF;

  UPDATE public.co_line_items SET labor_pricing_method=_method WHERE id=li.id;
  UPDATE public.change_orders
  SET tc_submitted_price=NULL,tc_snapshot_hourly_rate=NULL,tc_snapshot_markup_percent=NULL,updated_at=now()
  WHERE id=c.id;
END; $function$;

REVOKE ALL ON FUNCTION public.set_co_item_labor_pricing_method(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_co_item_labor_pricing_method(uuid,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_co_item_labor_pricing_method(uuid,text,uuid) TO service_role;