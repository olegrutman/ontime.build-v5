CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_status
  ON public.purchase_orders (project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_participants_project_invite_status
  ON public.project_participants (project_id, invite_status);

CREATE INDEX IF NOT EXISTS idx_project_participants_project_role_invite
  ON public.project_participants (project_id, role, invite_status);

CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id
  ON public.project_contracts (project_id);

CREATE INDEX IF NOT EXISTS idx_project_sov_project_id
  ON public.project_sov (project_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id
  ON public.suppliers (organization_id);