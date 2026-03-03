
ALTER TABLE project_contracts
  ADD COLUMN material_markup_type TEXT DEFAULT NULL,
  ADD COLUMN material_markup_value NUMERIC DEFAULT NULL,
  ADD COLUMN owner_contract_value NUMERIC DEFAULT NULL;
