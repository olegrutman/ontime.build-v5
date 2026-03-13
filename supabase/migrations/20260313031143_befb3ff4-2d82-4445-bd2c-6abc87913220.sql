
ALTER TABLE supplier_estimates DROP CONSTRAINT supplier_estimates_project_id_fkey;
ALTER TABLE supplier_estimates ADD CONSTRAINT supplier_estimates_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_project_id_fkey;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
