-- Add SOV item reference to schedule items
ALTER TABLE public.project_schedule_items 
ADD COLUMN sov_item_id UUID REFERENCES public.project_sov_items(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_project_schedule_items_sov_item_id ON public.project_schedule_items(sov_item_id);

-- Function to sync schedule progress to SOV completion
CREATE OR REPLACE FUNCTION public.sync_schedule_to_sov()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if SOV item is linked and progress changed
  IF NEW.sov_item_id IS NOT NULL AND (OLD.sov_item_id IS NULL OR NEW.progress != OLD.progress) THEN
    UPDATE public.project_sov_items 
    SET 
      total_completion_percent = NEW.progress,
      updated_at = now()
    WHERE id = NEW.sov_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync invoice approval to schedule progress  
CREATE OR REPLACE FUNCTION public.sync_invoice_to_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync when invoice is approved (status change from non-approved to approved)
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    -- Update schedule progress based on SOV billing completion for linked items
    UPDATE public.project_schedule_items 
    SET 
      progress = (
        SELECT COALESCE(
          ROUND(
            LEAST(
              (sov.total_billed_amount / NULLIF(sov.value_amount, 0)) * 100, 
              100
            )
          ), 
          0
        )
        FROM public.project_sov_items sov
        WHERE sov.id = project_schedule_items.sov_item_id
      ),
      updated_at = now()
    WHERE sov_item_id IN (
      SELECT DISTINCT ili.sov_item_id 
      FROM public.invoice_line_items ili 
      WHERE ili.invoice_id = NEW.id AND ili.sov_item_id IS NOT NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for schedule progress -> SOV completion sync
CREATE TRIGGER trigger_sync_schedule_to_sov
  AFTER UPDATE ON public.project_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_schedule_to_sov();

-- Trigger for invoice approval -> schedule progress sync  
CREATE TRIGGER trigger_sync_invoice_to_schedule
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_to_schedule();