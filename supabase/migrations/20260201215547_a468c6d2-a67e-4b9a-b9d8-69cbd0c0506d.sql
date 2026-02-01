-- Create function to auto-lock SOV when first invoice is created
CREATE OR REPLACE FUNCTION public.auto_lock_sov_on_first_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if invoice has an sov_id
  IF NEW.sov_id IS NOT NULL THEN
    -- Check if this is the first invoice for this SOV
    -- (no other invoices exist for this SOV)
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE sov_id = NEW.sov_id 
        AND id != NEW.id
    ) THEN
      -- This is the first invoice - auto-lock the SOV
      UPDATE public.project_sov
      SET is_locked = true,
          locked_at = NOW(),
          locked_by = NEW.created_by
      WHERE id = NEW.sov_id
        AND is_locked = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to fire after invoice insert
DROP TRIGGER IF EXISTS trigger_auto_lock_sov_on_first_invoice ON public.invoices;

CREATE TRIGGER trigger_auto_lock_sov_on_first_invoice
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.auto_lock_sov_on_first_invoice();