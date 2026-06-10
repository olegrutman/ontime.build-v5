
ALTER TABLE public.project_contracts DROP CONSTRAINT IF EXISTS project_contracts_from_role_check;
ALTER TABLE public.project_contracts ADD CONSTRAINT project_contracts_from_role_check
  CHECK (from_role = ANY (ARRAY['Owner'::text, 'General Contractor'::text, 'Trade Contractor'::text, 'Field Crew'::text]));

-- Backfill: any contract row that has a non-null owner_contract_value AND from_role is wrong
-- should be tagged as the Owner -> GC prime leg.
UPDATE public.project_contracts
SET from_role = 'Owner', from_org_id = NULL
WHERE owner_contract_value IS NOT NULL
  AND owner_contract_value > 0
  AND from_role <> 'Owner'
  AND to_role = 'General Contractor';
