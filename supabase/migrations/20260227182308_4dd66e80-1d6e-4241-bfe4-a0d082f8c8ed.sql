ALTER TABLE supplier_estimates
  ADD CONSTRAINT supplier_estimates_project_org_unique
  UNIQUE (project_id, supplier_org_id);