CREATE OR REPLACE FUNCTION public.co_grand_total(_co_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.can_access_change_order(_co_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  WITH base AS (
    SELECT id, project_id, use_fc_pricing_base, tc_submitted_price,
           co_material_responsible_override, materials_responsible,
           co_equipment_responsible_override, equipment_responsible
    FROM public.change_orders WHERE id = _co_id
  ),
  contract_default AS (
    -- Prefer the contract governing the trade work (from_role <> 'Owner'); the
    -- Owner->GC contract says "GC" for materials and must not leak onto trade COs.
    SELECT pc.material_responsibility
    FROM public.project_contracts pc, base b
    WHERE pc.project_id = b.project_id
      AND pc.material_responsibility IS NOT NULL
    ORDER BY (COALESCE(pc.from_role, '') = 'Owner'), pc.created_at
    LIMIT 1
  ),
  co AS (
    SELECT b.use_fc_pricing_base,
           b.tc_submitted_price,
           COALESCE(b.co_material_responsible_override, b.materials_responsible,
                    (SELECT material_responsibility FROM contract_default), 'TC') AS mat_resp,
           COALESCE(b.co_equipment_responsible_override, b.equipment_responsible, 'TC') AS eq_resp
    FROM base b
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
$$;