
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS co_ids text[] DEFAULT NULL;

-- Update can_request_fc_change_order_input to remove 'combined' from status list
CREATE OR REPLACE FUNCTION public.can_request_fc_change_order_input(
  _co_id uuid,
  _fc_org_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    JOIN public.organizations org ON org.id = _fc_org_id
    JOIN public.project_team pt ON pt.project_id = co.project_id AND pt.org_id = _fc_org_id
    WHERE co.id = _co_id
      AND co.assigned_to_org_id IS NOT NULL
      AND public.user_in_org(_user_id, co.assigned_to_org_id)
      AND co.status IN ('draft', 'shared', 'rejected')
      AND org.type = 'FC'
      AND _fc_org_id <> co.org_id
      AND _fc_org_id <> co.assigned_to_org_id
  );
$$;
