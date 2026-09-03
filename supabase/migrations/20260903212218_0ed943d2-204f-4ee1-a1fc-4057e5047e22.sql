
CREATE OR REPLACE FUNCTION public.recalc_supplier_estimate_total(_estimate_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub numeric := 0;
  _tax numeric := 0;
BEGIN
  SELECT COALESCE(SUM(COALESCE(line_total, COALESCE(quantity,0) * COALESCE(unit_price,0))), 0)
    INTO _sub
  FROM public.supplier_estimate_items
  WHERE estimate_id = _estimate_id;

  SELECT COALESCE(sales_tax_percent, 0) INTO _tax
  FROM public.supplier_estimates WHERE id = _estimate_id;

  UPDATE public.supplier_estimates
     SET total_amount = ROUND(_sub * (1 + _tax / 100.0), 2)
   WHERE id = _estimate_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalc_supplier_estimate_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_supplier_estimate_total(OLD.estimate_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_supplier_estimate_total(NEW.estimate_id);
  IF TG_OP = 'UPDATE' AND OLD.estimate_id IS DISTINCT FROM NEW.estimate_id THEN
    PERFORM public.recalc_supplier_estimate_total(OLD.estimate_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estimate_items_recalc_total ON public.supplier_estimate_items;
CREATE TRIGGER trg_estimate_items_recalc_total
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_estimate_items
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_supplier_estimate_total();

CREATE OR REPLACE FUNCTION public.trg_estimate_tax_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.sales_tax_percent,0) IS DISTINCT FROM COALESCE(NEW.sales_tax_percent,0) THEN
    PERFORM public.recalc_supplier_estimate_total(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estimate_tax_recalc ON public.supplier_estimates;
CREATE TRIGGER trg_estimate_tax_recalc
AFTER UPDATE OF sales_tax_percent ON public.supplier_estimates
FOR EACH ROW EXECUTE FUNCTION public.trg_estimate_tax_recalc();

-- Backfill every estimate total from its line items
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.supplier_estimates LOOP
    PERFORM public.recalc_supplier_estimate_total(r.id);
  END LOOP;
END $$;
