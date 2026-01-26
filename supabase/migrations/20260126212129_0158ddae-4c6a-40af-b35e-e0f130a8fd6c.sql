
-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.validate_contract_direction()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent self-referential contracts
  IF NEW.from_org_id = NEW.to_org_id AND NEW.from_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Contract cannot have the same organization on both sides';
  END IF;

  -- Validate role combinations for proper invoicing flow
  -- The from_org creates invoices, to_org receives/approves them
  -- Valid invoice flows: FC→TC, TC→GC
  -- Invalid: GC billing anyone downstream, TC billing FC
  
  IF NEW.from_role = 'Trade Contractor' AND NEW.to_role = 'Field Crew' THEN
    RAISE EXCEPTION 'Invalid contract direction: Trade Contractor cannot bill Field Crew. Field Crews invoice Trade Contractors.';
  END IF;
  
  IF NEW.from_role = 'General Contractor' AND NEW.to_role IN ('Trade Contractor', 'Field Crew') THEN
    RAISE EXCEPTION 'Invalid contract direction: General Contractor cannot bill downstream parties.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
