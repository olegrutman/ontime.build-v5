-- Add contract_id and sov_id to invoices for contract-based billing
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.project_contracts(id) ON DELETE CASCADE;

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS sov_id UUID REFERENCES public.project_sov(id) ON DELETE SET NULL;

-- Add sov_item_id and billed_percent to invoice_line_items for percent-based billing
ALTER TABLE public.invoice_line_items 
ADD COLUMN IF NOT EXISTS sov_item_id UUID REFERENCES public.project_sov_items(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_line_items 
ADD COLUMN IF NOT EXISTS billed_percent DECIMAL(5,2) DEFAULT 0;

-- Add total_completion_percent and total_billed_amount to project_sov_items
-- These track cumulative billing across all invoices
ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS total_completion_percent DECIMAL(5,2) DEFAULT 0;

ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS total_billed_amount DECIMAL(12,2) DEFAULT 0;

-- Create function to update SOV item completion when invoice is submitted/approved
CREATE OR REPLACE FUNCTION public.update_sov_completion_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- When invoice moves to SUBMITTED, APPROVED, or PAID, update SOV completion percentages
  IF NEW.status IN ('SUBMITTED', 'APPROVED', 'PAID') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('SUBMITTED', 'APPROVED', 'PAID')) THEN
    
    -- Add the billed percentages from this invoice to SOV items
    UPDATE public.project_sov_items psi
    SET 
      total_completion_percent = COALESCE(psi.total_completion_percent, 0) + COALESCE(ili.billed_percent, 0),
      total_billed_amount = COALESCE(psi.total_billed_amount, 0) + COALESCE(ili.current_billed, 0),
      billed_to_date = COALESCE(psi.billed_to_date, 0) + COALESCE(ili.current_billed, 0)
    FROM public.invoice_line_items ili
    WHERE ili.invoice_id = NEW.id
      AND ili.sov_item_id = psi.id;
  
  -- When invoice is rejected or reverted to draft, subtract the billing
  ELSIF OLD.status IN ('SUBMITTED', 'APPROVED', 'PAID') AND 
        NEW.status IN ('DRAFT', 'REJECTED') THEN
    
    UPDATE public.project_sov_items psi
    SET 
      total_completion_percent = GREATEST(0, COALESCE(psi.total_completion_percent, 0) - COALESCE(ili.billed_percent, 0)),
      total_billed_amount = GREATEST(0, COALESCE(psi.total_billed_amount, 0) - COALESCE(ili.current_billed, 0)),
      billed_to_date = GREATEST(0, COALESCE(psi.billed_to_date, 0) - COALESCE(ili.current_billed, 0))
    FROM public.invoice_line_items ili
    WHERE ili.invoice_id = NEW.id
      AND ili.sov_item_id = psi.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for invoice status changes
DROP TRIGGER IF EXISTS update_sov_on_invoice_status ON public.invoices;
CREATE TRIGGER update_sov_on_invoice_status
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sov_completion_from_invoice();

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sov_id ON public.invoices(sov_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_sov_item_id ON public.invoice_line_items(sov_item_id);