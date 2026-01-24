-- Drop existing check constraint on to_role
ALTER TABLE project_contracts DROP CONSTRAINT project_contracts_to_role_check;

-- Add new check constraint that includes General Contractor
ALTER TABLE project_contracts ADD CONSTRAINT project_contracts_to_role_check 
CHECK (to_role = ANY (ARRAY['General Contractor'::text, 'Trade Contractor'::text, 'Field Crew'::text, 'Supplier'::text]));