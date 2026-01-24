
-- Add scheduled value and billing tracking columns to project_sov_items
ALTER TABLE public.project_sov_items
ADD COLUMN scheduled_value NUMERIC DEFAULT 0,
ADD COLUMN billed_to_date NUMERIC DEFAULT 0;

-- Create a function to update billed_to_date from invoice line items
-- This will be called when invoices are approved
CREATE OR REPLACE FUNCTION public.update_sov_billing_totals(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update billed_to_date for each SOV item based on approved/paid invoices
  UPDATE project_sov_items psi
  SET billed_to_date = COALESCE(
    (
      SELECT SUM(ili.current_billed)
      FROM invoice_line_items ili
      JOIN invoices i ON i.id = ili.invoice_id
      WHERE i.project_id = p_project_id
      AND i.status IN ('SUBMITTED', 'APPROVED', 'PAID')
      AND ili.description = psi.item_name
    ),
    0
  )
  WHERE psi.project_id = p_project_id;
END;
$$;
