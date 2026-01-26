
-- First, update the from_role constraint to allow Field Crew
ALTER TABLE project_contracts 
DROP CONSTRAINT IF EXISTS project_contracts_from_role_check;

ALTER TABLE project_contracts 
ADD CONSTRAINT project_contracts_from_role_check 
CHECK (from_role = ANY (ARRAY['General Contractor'::text, 'Trade Contractor'::text, 'Field Crew'::text]));

-- Fix inverted TC→FC contract (should be FC→TC for invoicing)
-- Contract e82a0f55-8377-4153-acff-563a99d99b20: swap from_org and to_org
UPDATE project_contracts 
SET 
  from_org_id = '5946bfde-779f-4163-bbfa-bce5476d79f1',
  to_org_id = '4c3f7d6c-7baf-4bb9-8739-f299586701e6',
  from_role = 'Field Crew',
  to_role = 'Trade Contractor'
WHERE id = 'e82a0f55-8377-4153-acff-563a99d99b20';

-- Delete self-referential contract (invalid - same org on both sides)
DELETE FROM project_contracts 
WHERE id = '6b9fbb91-d255-4242-aaee-d834278f0f9d';

-- Add validation trigger to prevent invalid contract directions
CREATE OR REPLACE FUNCTION public.validate_contract_direction()
RETURNS TRIGGER AS $$
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

-- Create trigger
DROP TRIGGER IF EXISTS validate_contract_direction_trigger ON project_contracts;
CREATE TRIGGER validate_contract_direction_trigger
  BEFORE INSERT OR UPDATE ON project_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contract_direction();
