
CREATE OR REPLACE FUNCTION public.recalc_sov_item_billing(_sov_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric(12,2) := 0;
  v_value numeric(12,2) := 0;
  v_pct numeric(5,2) := 0;
  v_remaining numeric(12,2) := 0;
  v_status text := 'unbilled';
BEGIN
  IF _sov_item_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(ili.current_billed), 0)
    INTO v_total
  FROM public.invoice_line_items ili
  JOIN public.invoices i ON i.id = ili.invoice_id
  WHERE ili.sov_item_id = _sov_item_id
    AND UPPER(COALESCE(i.status, 'DRAFT')) NOT IN ('DRAFT', 'REJECTED', 'VOID', 'VOIDED', 'CANCELLED');

  SELECT COALESCE(value_amount, 0) INTO v_value
  FROM public.project_sov_items WHERE id = _sov_item_id;

  IF v_value > 0 THEN
    v_pct := LEAST(ROUND((v_total / v_value) * 100, 2), 100);
  ELSE
    v_pct := 0;
  END IF;

  v_remaining := GREATEST(v_value - v_total, 0);

  IF v_total <= 0 THEN
    v_status := 'unbilled';
  ELSIF v_total >= v_value AND v_value > 0 THEN
    v_status := 'fully_billed';
  ELSE
    v_status := 'partially_billed';
  END IF;

  UPDATE public.project_sov_items
  SET total_billed_amount = v_total,
      total_completion_percent = v_pct,
      remaining_amount = v_remaining,
      billing_status = v_status,
      billed_to_date = v_total,
      updated_at = now()
  WHERE id = _sov_item_id;
END;
$function$;

-- Also exclude voided invoices from the project-level billing rollup helper
CREATE OR REPLACE FUNCTION public.update_sov_billing_totals(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE project_sov_items psi
  SET billed_to_date = COALESCE(
    (
      SELECT SUM(ili.current_billed)
      FROM invoice_line_items ili
      JOIN invoices i ON i.id = ili.invoice_id
      WHERE i.project_id = p_project_id
      AND UPPER(COALESCE(i.status,'DRAFT')) IN ('SUBMITTED', 'APPROVED', 'PAID')
      AND ili.description = psi.item_name
    ),
    0
  )
  WHERE psi.project_id = p_project_id;
END;
$function$;

-- Backfill: recompute every SOV item so previously voided invoices drop out
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.project_sov_items LOOP
    PERFORM public.recalc_sov_item_billing(r.id);
  END LOOP;
END $$;
