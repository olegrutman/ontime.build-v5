-- C3: lock down purchase_orders.project_id
ALTER TABLE public.purchase_orders ALTER COLUMN project_id SET NOT NULL;

-- H3: prevent active project_team rows from having NULL user_id/org_id
ALTER TABLE public.project_team
  ADD CONSTRAINT project_team_active_requires_ids
  CHECK (status <> 'active' OR (user_id IS NOT NULL AND org_id IS NOT NULL))
  NOT VALID;
ALTER TABLE public.project_team VALIDATE CONSTRAINT project_team_active_requires_ids;
