UPDATE public.project_contracts
SET material_estimate_total = NULL
WHERE from_role IN ('Owner', 'Supplier')
  AND material_estimate_total IS NOT NULL;