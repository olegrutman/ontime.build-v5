-- Add pricing_type and lump_sum support to change_order_tc_labor
ALTER TABLE public.change_order_tc_labor
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'hourly', -- 'hourly' or 'lump_sum'
ADD COLUMN IF NOT EXISTS lump_sum NUMERIC(12,2);

-- Update the labor_total to be computed based on pricing_type
-- For lump_sum, labor_total should equal lump_sum
-- For hourly, labor_total should equal hours * hourly_rate
-- Note: We can't have conditional GENERATED columns, so we'll handle this in application code
-- or with a trigger

-- Drop the generated column first and recreate as regular column
-- Check if it's generated
DO $$
BEGIN
  -- If labor_total is a generated column, we need to drop and recreate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'change_order_tc_labor' 
    AND column_name = 'labor_total'
    AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.change_order_tc_labor DROP COLUMN labor_total;
    ALTER TABLE public.change_order_tc_labor ADD COLUMN labor_total NUMERIC(12,2);
  END IF;
END $$;

-- Create trigger to auto-calculate labor_total based on pricing_type
CREATE OR REPLACE FUNCTION public.calculate_tc_labor_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pricing_type = 'lump_sum' THEN
    NEW.labor_total := COALESCE(NEW.lump_sum, 0);
  ELSE
    -- Default to hourly
    NEW.labor_total := NEW.hours * COALESCE(NEW.hourly_rate, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_tc_labor_total ON public.change_order_tc_labor;
CREATE TRIGGER tr_calculate_tc_labor_total
  BEFORE INSERT OR UPDATE ON public.change_order_tc_labor
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_tc_labor_total();

-- Also add pricing_type to change_order_fc_hours for consistency
ALTER TABLE public.change_order_fc_hours
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'hourly', -- 'hourly' or 'lump_sum'
ADD COLUMN IF NOT EXISTS lump_sum NUMERIC(12,2);

-- Update FC hours trigger similarly
CREATE OR REPLACE FUNCTION public.calculate_fc_labor_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pricing_type = 'lump_sum' THEN
    NEW.labor_total := COALESCE(NEW.lump_sum, 0);
  ELSE
    -- Default to hourly
    NEW.labor_total := NEW.hours * COALESCE(NEW.hourly_rate, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if fc_hours has a generated column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'change_order_fc_hours' 
    AND column_name = 'labor_total'
    AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.change_order_fc_hours DROP COLUMN labor_total;
    ALTER TABLE public.change_order_fc_hours ADD COLUMN labor_total NUMERIC(12,2);
  END IF;
END $$;

DROP TRIGGER IF EXISTS tr_calculate_fc_labor_total ON public.change_order_fc_hours;
CREATE TRIGGER tr_calculate_fc_labor_total
  BEFORE INSERT OR UPDATE ON public.change_order_fc_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_fc_labor_total();