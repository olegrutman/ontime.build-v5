CREATE OR REPLACE FUNCTION public.link_field_item_conversion(p_item_id uuid, p_co_id uuid DEFAULT NULL::uuid, p_po_id uuid DEFAULT NULL::uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE i public.field_report_items;
BEGIN
  IF (p_co_id IS NULL) = (p_po_id IS NULL) THEN RAISE EXCEPTION 'Provide exactly one order'; END IF;
  SELECT * INTO i FROM public.field_report_items WHERE id = p_item_id FOR UPDATE;
  IF i.id IS NULL OR NOT public.user_in_org(auth.uid(), i.reviewer_org_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF i.status = 'converted' THEN RAISE EXCEPTION 'Item already converted'; END IF;
  IF i.status NOT IN ('crew_confirmed','reviewed','released','held') THEN RAISE EXCEPTION 'Item not ready'; END IF;
  IF p_co_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.change_orders WHERE id = p_co_id AND project_id = i.project_id) THEN
    RAISE EXCEPTION 'Order not on this project'; END IF;
  IF p_po_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = p_po_id AND project_id = i.project_id) THEN
    RAISE EXCEPTION 'Order not on this project'; END IF;
  PERFORM set_config('app.field_rpc', 'on', true);
  UPDATE public.field_report_items SET status = 'converted', converted_co_id = p_co_id, converted_po_id = p_po_id,
    reviewed_at = coalesce(reviewed_at, now()), reviewed_by = coalesce(reviewed_by, auth.uid()),
    released_at = coalesce(released_at, now()), released_by = coalesce(released_by, auth.uid())
    WHERE id = i.id;
  UPDATE public.field_reports SET status = 'reviewed'
    WHERE id = i.report_id AND status = 'submitted'
      AND NOT EXISTS (SELECT 1 FROM public.field_report_items WHERE report_id = i.report_id AND status IN ('draft','crew_confirmed'));
  PERFORM set_config('app.field_rpc', 'off', true);
END $function$;

DO $$ BEGIN
  PERFORM set_config('app.field_rpc','on',true);
  UPDATE public.field_report_items SET released_at = coalesce(reviewed_at, updated_at) WHERE status = 'converted' AND released_at IS NULL;
END $$;