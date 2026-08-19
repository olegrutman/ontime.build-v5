CREATE OR REPLACE FUNCTION public.co_grand_total(_co_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_change_order(_co_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  WITH co AS (
    SELECT use_fc_pricing_base,
           tc_submitted_price,
           COALESCE(co_material_responsible_override, materials_responsible, 'TC') AS mat_resp,
           COALESCE(co_equipment_responsible_override, equipment_responsible, 'TC') AS eq_resp
    FROM public.change_orders WHERE id = _co_id
  ),
  labor AS (
    SELECT
      COALESCE(SUM(CASE WHEN entered_by_role = 'TC' AND NOT is_actual_cost THEN line_total ELSE 0 END), 0) AS tc_labor,
      COALESCE(SUM(CASE WHEN NOT is_actual_cost THEN line_total ELSE 0 END), 0) AS all_labor
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
      WHEN labor.tc_labor > 0 THEN labor.tc_labor
      ELSE labor.all_labor
    END
    + CASE WHEN co.mat_resp = 'GC' THEN 0 ELSE mats.total END
    + CASE WHEN co.eq_resp  = 'GC' THEN 0 ELSE eq.total  END
  INTO v_result
  FROM co, labor, mats, eq;

  RETURN v_result;
END;
$function$;