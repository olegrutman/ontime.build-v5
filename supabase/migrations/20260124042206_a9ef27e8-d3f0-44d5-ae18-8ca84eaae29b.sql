-- Contract-based SOV with Percent Allocation
-- 1. Remove the UNIQUE constraint on project_sov.project_id to allow multiple SOVs per project
-- 2. Add contract_id to project_sov
-- 3. Add percent_of_contract to project_sov_items
-- 4. Add value_amount (derived) to project_sov_items
-- 5. Update project_sov_items to reference sov_id instead of project_id

-- Drop existing unique constraint if exists
ALTER TABLE public.project_sov DROP CONSTRAINT IF EXISTS project_sov_project_id_key;

-- Add contract_id to project_sov (references project_contracts)
ALTER TABLE public.project_sov 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.project_contracts(id) ON DELETE CASCADE;

-- Add sov_name for display
ALTER TABLE public.project_sov 
ADD COLUMN IF NOT EXISTS sov_name TEXT;

-- Add percent_of_contract and value_amount to project_sov_items
ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS sov_id UUID REFERENCES public.project_sov(id) ON DELETE CASCADE;

ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS percent_of_contract DECIMAL(5,2) DEFAULT 0;

ALTER TABLE public.project_sov_items 
ADD COLUMN IF NOT EXISTS value_amount DECIMAL(12,2) DEFAULT 0;

-- Create function to recalculate SOV item values when contract changes
CREATE OR REPLACE FUNCTION public.recalculate_sov_values()
RETURNS TRIGGER AS $$
BEGIN
  -- When contract_sum changes, recalculate all SOV item values
  UPDATE public.project_sov_items psi
  SET value_amount = ROUND((NEW.contract_sum * psi.percent_of_contract / 100), 2)
  FROM public.project_sov ps
  WHERE ps.contract_id = NEW.id
    AND psi.sov_id = ps.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for contract changes
DROP TRIGGER IF EXISTS recalculate_sov_on_contract_change ON public.project_contracts;
CREATE TRIGGER recalculate_sov_on_contract_change
  AFTER UPDATE OF contract_sum ON public.project_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_sov_values();

-- Create function to validate SOV percent totals
CREATE OR REPLACE FUNCTION public.validate_sov_percent_total(p_sov_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_percent DECIMAL(7,2);
BEGIN
  SELECT COALESCE(SUM(percent_of_contract), 0) INTO total_percent
  FROM public.project_sov_items
  WHERE sov_id = p_sov_id;
  
  -- Allow small tolerance for rounding (0.01)
  RETURN ABS(total_percent - 100.00) <= 0.01 OR total_percent = 0;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add status field to project_contracts if not exists
ALTER TABLE public.project_contracts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Invited' CHECK (status IN ('Invited', 'Accepted', 'Active'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_sov_contract_id ON public.project_sov(contract_id);
CREATE INDEX IF NOT EXISTS idx_project_sov_items_sov_id ON public.project_sov_items(sov_id);