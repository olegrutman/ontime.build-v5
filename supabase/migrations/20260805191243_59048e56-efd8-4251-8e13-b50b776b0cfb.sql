DROP FUNCTION IF EXISTS public.convert_change_order_to_contract() CASCADE;

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
    + mats.total + eq.total
  INTO v_result
  FROM co, labor, mats, eq;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_co_contract_delta()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id uuid;
  v_old_amt numeric := 0;
  v_new_amt numeric := 0;
  v_was_applied boolean;
  v_is_applied boolean;
BEGIN
  -- "applied" means the CO is approved (or acknowledged/contracted) with an approval timestamp
  v_was_applied := (TG_OP = 'UPDATE' AND OLD.status IN ('approved','contracted') AND OLD.approved_at IS NOT NULL);
  v_is_applied  := (NEW.status IN ('approved','contracted') AND NEW.approved_at IS NOT NULL);

  IF NEW.org_id IS NULL OR NEW.assigned_to_org_id IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_contract_id := public._co_target_contract_id(NEW.project_id, NEW.org_id, NEW.assigned_to_org_id);
  IF v_contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_was_applied THEN v_old_amt := public.co_grand_total(NEW.id); END IF;
  IF v_is_applied  THEN v_new_amt := public.co_grand_total(NEW.id); END IF;

  IF v_old_amt <> v_new_amt THEN
    UPDATE public.project_contracts
       SET contract_sum = COALESCE(contract_sum, 0) + (v_new_amt - v_old_amt),
           updated_at = now()
     WHERE id = v_contract_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_billable_change_orders(p_project_id uuid, p_from_org_id uuid)
 RETURNS TABLE(co_id uuid, co_number text, title text, description text, contract_id uuid, contract_sum numeric, from_org_name text, to_org_id uuid, to_org_name text, to_role text, grand_total numeric, already_billed numeric, remaining numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_see_project(p_project_id) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid() AND organization_id = p_from_org_id
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING errcode = '42501';
  END IF;

  RETURN QUERY
  WITH cos AS (
    SELECT
      co.id,
      co.co_number,
      co.title,
      co.reason_note AS description,
      co.org_id,
      co.assigned_to_org_id,
      public._co_target_contract_id(co.project_id, co.org_id, co.assigned_to_org_id) AS contract_id,
      public.co_grand_total(co.id) AS grand_total
    FROM public.change_orders co
    WHERE co.project_id = p_project_id
      -- the org doing the work bills upstream, regardless of who created the CO
      AND (co.org_id = p_from_org_id OR co.assigned_to_org_id = p_from_org_id)
      AND co.status IN ('approved','contracted')
      AND co.approved_at IS NOT NULL
  ),
  billed AS (
    SELECT
      b.co_id,
      COALESCE(SUM(b.amount), 0) AS amount
    FROM (
      SELECT
        co_id_unnest::uuid AS co_id,
        COALESCE((
          SELECT SUM(ili.current_billed) FROM public.invoice_line_items ili WHERE ili.invoice_id = inv.id
        ), 0) / GREATEST(array_length(inv.co_ids, 1), 1) AS amount
      FROM public.invoices inv
      CROSS JOIN LATERAL unnest(COALESCE(inv.co_ids, ARRAY[]::text[])) AS co_id_unnest
      WHERE inv.project_id = p_project_id
        AND inv.status IN ('SUBMITTED','APPROVED','PAID')
    ) b
    GROUP BY b.co_id
  )
  SELECT
    cos.id,
    cos.co_number,
    cos.title,
    cos.description,
    cos.contract_id,
    COALESCE(pc.contract_sum, 0)::numeric,
    fo.name AS from_org_name,
    pc.to_org_id,
    o.name AS to_org_name,
    pc.to_role,
    COALESCE(cos.grand_total, 0)::numeric,
    COALESCE(billed.amount, 0)::numeric,
    GREATEST(COALESCE(cos.grand_total, 0) - COALESCE(billed.amount, 0), 0)::numeric
  FROM cos
  LEFT JOIN public.project_contracts pc ON pc.id = cos.contract_id
  LEFT JOIN public.organizations o ON o.id = pc.to_org_id
  LEFT JOIN public.organizations fo ON fo.id = pc.from_org_id
  LEFT JOIN billed ON billed.co_id = cos.id
  WHERE cos.contract_id IS NOT NULL
    AND COALESCE(cos.grand_total, 0) > 0
  ORDER BY cos.co_number NULLS LAST;
END;
$function$;