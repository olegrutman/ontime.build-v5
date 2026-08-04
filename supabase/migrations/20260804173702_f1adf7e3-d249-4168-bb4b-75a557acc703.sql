CREATE OR REPLACE FUNCTION public.recalc_po_totals(_po_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_est numeric := 0;
  v_non numeric := 0;
  v_tax_pct numeric := 0;
  v_sub numeric := 0;
  v_tax numeric := 0;
BEGIN
  SELECT COALESCE(sales_tax_percent, 0) INTO v_tax_pct
  FROM purchase_orders WHERE id = _po_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN source_estimate_item_id IS NOT NULL THEN COALESCE(line_total, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN source_estimate_item_id IS NULL THEN COALESCE(line_total, 0) ELSE 0 END), 0)
  INTO v_est, v_non
  FROM po_line_items WHERE po_id = _po_id;

  v_sub := v_est + v_non;
  v_tax := ROUND(v_sub * v_tax_pct / 100.0, 2);

  UPDATE purchase_orders
  SET po_subtotal_estimate_items = v_est,
      po_subtotal_non_estimate_items = v_non,
      po_subtotal_total = v_sub,
      po_tax_total = v_tax,
      po_total = v_sub + v_tax,
      tax_percent_applied = v_tax_pct
  WHERE id = _po_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_po_line_items_recalc_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_po_totals(OLD.po_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_po_totals(NEW.po_id);
  IF TG_OP = 'UPDATE' AND OLD.po_id IS DISTINCT FROM NEW.po_id THEN
    PERFORM public.recalc_po_totals(OLD.po_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS po_line_items_recalc_totals ON public.po_line_items;
CREATE TRIGGER po_line_items_recalc_totals
AFTER INSERT OR UPDATE OR DELETE ON public.po_line_items
FOR EACH ROW EXECUTE FUNCTION public.trg_po_line_items_recalc_totals();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.purchase_orders LOOP
    PERFORM public.recalc_po_totals(r.id);
  END LOOP;
END;
$$;