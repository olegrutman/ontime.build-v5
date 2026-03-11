-- Add missing updated_at column to project_sov_items
ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to auto-update the timestamp
CREATE TRIGGER update_project_sov_items_updated_at
  BEFORE UPDATE ON public.project_sov_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();