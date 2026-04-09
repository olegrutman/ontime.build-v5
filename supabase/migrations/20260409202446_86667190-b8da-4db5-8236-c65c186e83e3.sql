
-- Create trigger function to update SOV when invoice is deleted
CREATE OR REPLACE FUNCTION public.update_sov_on_invoice_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('SUBMITTED', 'APPROVED', 'PAID') THEN
    UPDATE public.project_sov_items psi
    SET 
      total_completion_percent = GREATEST(0, COALESCE(psi.total_completion_percent, 0) - COALESCE(ili.billed_percent, 0)),
      total_billed_amount = GREATEST(0, COALESCE(psi.total_billed_amount, 0) - COALESCE(ili.current_billed, 0)),
      billed_to_date = GREATEST(0, COALESCE(psi.billed_to_date, 0) - COALESCE(ili.current_billed, 0))
    FROM public.invoice_line_items ili
    WHERE ili.invoice_id = OLD.id
      AND ili.sov_item_id = psi.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create BEFORE DELETE trigger on invoices
CREATE TRIGGER trg_update_sov_on_invoice_delete
  BEFORE DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sov_on_invoice_delete();

-- Backfill: recalculate SOV items from actual existing invoice data
UPDATE public.project_sov_items psi
SET
  total_billed_amount = COALESCE(agg.total_billed, 0),
  total_completion_percent = CASE 
    WHEN COALESCE(psi.value_amount, 0) > 0 
    THEN ROUND((COALESCE(agg.total_billed, 0) / psi.value_amount) * 100, 2)
    ELSE 0 
  END,
  billed_to_date = COALESCE(agg.total_billed, 0)
FROM (
  SELECT 
    ili.sov_item_id,
    SUM(ili.current_billed) as total_billed
  FROM public.invoice_line_items ili
  JOIN public.invoices inv ON inv.id = ili.invoice_id
  WHERE inv.status IN ('SUBMITTED', 'APPROVED', 'PAID')
    AND ili.sov_item_id IS NOT NULL
  GROUP BY ili.sov_item_id
) agg
WHERE agg.sov_item_id = psi.id;

-- Also zero out SOV items that have NO matching invoice line items at all
UPDATE public.project_sov_items psi
SET
  total_billed_amount = 0,
  total_completion_percent = 0,
  billed_to_date = 0
WHERE (COALESCE(psi.total_billed_amount, 0) > 0 OR COALESCE(psi.total_completion_percent, 0) > 0)
  AND NOT EXISTS (
    SELECT 1 FROM public.invoice_line_items ili
    JOIN public.invoices inv ON inv.id = ili.invoice_id
    WHERE ili.sov_item_id = psi.id
      AND inv.status IN ('SUBMITTED', 'APPROVED', 'PAID')
  );
