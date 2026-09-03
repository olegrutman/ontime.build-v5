
REVOKE ALL ON FUNCTION public.recalc_supplier_estimate_total(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_recalc_supplier_estimate_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_estimate_tax_recalc() FROM PUBLIC, anon, authenticated;
