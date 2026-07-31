CREATE OR REPLACE FUNCTION public.co_grand_total(_co_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_change_order(_co_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  WITH co AS (
    SELECT use_fc_pricing_base, tc_submitted_price FROM public.change_orders WHERE id = _co_id
  ),
  labor AS (
    SELECT
      COALESCE(SUM(CASE WHEN entered_by_role = 'TC' AND NOT is_actual_cost THEN line_total ELSE 0 END), 0) AS tc_labor
    FROM public.co_labor_entries WHERE co_id = _co_id
  ),
  mats AS (
    SELECT COALESCE(SUM(billed_amount), 0) AS total FROM public.co_material_items WHERE co_id = _co_id
  ),
  eq AS (
    SELECT COALESCE(SUM(billed_amount), 0) AS total FROM public.co_equipment_items WHERE co_id = _co_id
  )
  SELECT
    CASE
      WHEN co.use_fc_pricing_base AND COALESCE(co.tc_submitted_price, 0) > 0
        THEN co.tc_submitted_price
      ELSE labor.tc_labor
    END
    + mats.total + eq.total
  INTO v_result
  FROM co, labor, mats, eq;

  RETURN v_result;
END;
$function$;