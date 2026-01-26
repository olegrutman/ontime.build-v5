-- Fix search_path security warning for trigger functions
CREATE OR REPLACE FUNCTION public.calculate_tc_labor_total()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pricing_type = 'lump_sum' THEN
    NEW.labor_total := COALESCE(NEW.lump_sum, 0);
  ELSE
    -- Default to hourly
    NEW.labor_total := NEW.hours * COALESCE(NEW.hourly_rate, 0);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_fc_labor_total()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.pricing_type = 'lump_sum' THEN
    NEW.labor_total := COALESCE(NEW.lump_sum, 0);
  ELSE
    -- Default to hourly
    NEW.labor_total := NEW.hours * COALESCE(NEW.hourly_rate, 0);
  END IF;
  RETURN NEW;
END;
$$;