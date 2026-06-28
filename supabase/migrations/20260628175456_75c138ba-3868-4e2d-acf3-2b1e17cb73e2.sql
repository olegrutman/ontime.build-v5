
-- 1) Stop proportional rescaling of baseline SOV lines on contract_sum changes
DROP TRIGGER IF EXISTS recalculate_sov_on_contract_change ON public.project_contracts;

-- 2) Per-SOV-item rollup function from invoice_line_items (excluding DRAFT invoices)
CREATE OR REPLACE FUNCTION public.recalc_sov_item_billing(_sov_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND COALESCE(i.status, 'DRAFT') <> 'DRAFT';

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
$$;

-- 3) Trigger function for invoice_line_items writes
CREATE OR REPLACE FUNCTION public.trg_invoice_line_items_recalc_sov()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_sov_item_billing(OLD.sov_item_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.sov_item_id IS DISTINCT FROM OLD.sov_item_id THEN
      PERFORM public.recalc_sov_item_billing(OLD.sov_item_id);
    END IF;
    PERFORM public.recalc_sov_item_billing(NEW.sov_item_id);
    RETURN NEW;
  ELSE
    PERFORM public.recalc_sov_item_billing(NEW.sov_item_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS invoice_line_items_recalc_sov ON public.invoice_line_items;
CREATE TRIGGER invoice_line_items_recalc_sov
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_line_items_recalc_sov();

-- 4) Trigger on invoices status changes (DRAFT <-> finalized) recomputes affected items
CREATE OR REPLACE FUNCTION public.trg_invoices_status_recalc_sov()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') = COALESCE(NEW.status,'') THEN
    RETURN NEW;
  END IF;
  FOR r IN SELECT DISTINCT sov_item_id FROM public.invoice_line_items
           WHERE invoice_id = COALESCE(NEW.id, OLD.id) AND sov_item_id IS NOT NULL
  LOOP
    PERFORM public.recalc_sov_item_billing(r.sov_item_id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS invoices_status_recalc_sov ON public.invoices;
CREATE TRIGGER invoices_status_recalc_sov
AFTER UPDATE OF status OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_invoices_status_recalc_sov();

-- 5) Backfill every existing SOV item
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.project_sov_items LOOP
    PERFORM public.recalc_sov_item_billing(r.id);
  END LOOP;
END $$;
