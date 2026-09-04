ALTER TABLE public.project_contracts DROP CONSTRAINT IF EXISTS project_contracts_from_role_check;
ALTER TABLE public.project_contracts ADD CONSTRAINT project_contracts_from_role_check
  CHECK (from_role = ANY (ARRAY['Owner'::text, 'General Contractor'::text, 'Trade Contractor'::text, 'Field Crew'::text, 'Supplier'::text]));