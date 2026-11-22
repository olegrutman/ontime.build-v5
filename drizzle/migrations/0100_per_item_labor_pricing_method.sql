ALTER TABLE public.co_line_items
  ADD COLUMN labor_pricing_method text;

ALTER TABLE public.co_line_items
  ADD CONSTRAINT co_line_items_labor_pricing_method_check
  CHECK (labor_pricing_method IS NULL OR labor_pricing_method IN ('crew', 'manual'));

COMMENT ON COLUMN public.co_line_items.labor_pricing_method IS
  'Per-item labor price source: crew or manual. NULL inherits change_orders.use_fc_pricing_base for backward compatibility.';

CREATE OR REPLACE VIEW public.co_line_items_role_view WITH (security_invoker=true) AS
SELECT id,co_id,org_id,created_by_role,catalog_item_id,item_name,division,category_name,unit,qty,sort_order,created_at,location_tag,reason,description,quantity_source,ai_confidence,ai_reasoning,task_index,pricing_mode,task_phase,pricing_type,
  CASE WHEN public.co_viewer_role(co_id)=ANY(ARRAY['gc','tc']) THEN nte_cap ELSE NULL::numeric END AS nte_cap,
  source,scenario_id,group_key,approval_status,approval_rejection_reason,approval_decided_by,approval_decided_at,completed_at,completed_by_user_id,labor_pricing_method
FROM public.co_line_items;

CREATE OR REPLACE FUNCTION public.audit_co_line_items_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  fields text[] := ARRAY['pricing_type','nte_cap','labor_pricing_method'];
  f text; old_val jsonb; new_val jsonb;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT to_jsonb(($1).%I), to_jsonb(($2).%I)', f, f) INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO co_audit_log (co_id, source_table, source_row_id, field_name, old_value, new_value)
      VALUES (NEW.co_id, 'co_line_items', NEW.id, f, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END; $function$;

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

CREATE OR REPLACE FUNCTION public.set_crew_pricing_base(_co_id uuid, _enabled boolean, _org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c public.change_orders; biller uuid;
BEGIN
 SELECT * INTO c FROM public.change_orders WHERE id=_co_id FOR UPDATE;
 IF c.id IS NULL OR auth.uid() IS NULL OR _enabled IS NULL THEN RAISE EXCEPTION 'Order not found or not authorized'; END IF;
 biller := CASE WHEN c.created_by_role='FC' AND (c.originating_org_id IS NULL OR c.originating_org_id=c.org_id) AND c.assigned_to_org_id IS NOT NULL AND c.assigned_to_org_id<>c.org_id THEN c.assigned_to_org_id ELSE c.org_id END;
 IF biller<>_org_id OR NOT public.user_in_org(auth.uid(),_org_id) OR NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=_org_id AND type='TC') OR NOT public.is_project_participant(auth.uid(),c.project_id) THEN RAISE EXCEPTION 'Not authorized to change this pricing base'; END IF;
 IF c.status NOT IN ('draft','shared','work_in_progress','closed_for_pricing') AND NOT (c.status='submitted' AND c.created_by_role='FC' AND c.assigned_to_org_id=_org_id AND (c.originating_org_id IS NULL OR c.originating_org_id=c.org_id)) THEN RAISE EXCEPTION 'Recall the upstream submission before changing billing'; END IF;
 IF NOT _enabled THEN
   DELETE FROM public.co_labor_entries e
   USING public.co_line_items li
   WHERE e.co_line_item_id=li.id AND li.co_id=_co_id AND li.labor_pricing_method IS NULL
     AND e.org_id=_org_id AND e.entered_by_role='TC' AND e.crew_pricing_derived;
 END IF;
 UPDATE public.change_orders SET use_fc_pricing_base=_enabled,tc_submitted_price=NULL,tc_snapshot_hourly_rate=NULL,tc_snapshot_markup_percent=NULL,updated_at=now() WHERE id=_co_id;
END; $function$;

REVOKE ALL ON FUNCTION public.set_crew_pricing_base(uuid,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_crew_pricing_base(uuid,boolean,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_crew_pricing_base(uuid,boolean,uuid) TO service_role;

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
  IF EXISTS(
    SELECT 1 FROM public.co_labor_entries e
    JOIN public.co_line_items li ON li.id=e.co_line_item_id
    WHERE e.co_id=_co_id AND e.entered_by_role='FC' AND NOT e.is_actual_cost AND e.crew_review_status='pending'
      AND (li.labor_pricing_method='crew' OR (li.labor_pricing_method IS NULL AND _require_reviewed_crew_entries))
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

REVOKE ALL ON FUNCTION public._assert_crew_upstream_pricing_ready(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._assert_crew_upstream_pricing_ready(uuid,uuid,boolean) TO service_role;
