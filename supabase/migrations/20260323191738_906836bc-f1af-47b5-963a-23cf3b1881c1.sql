CREATE OR REPLACE FUNCTION public.can_access_change_order(_co_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    WHERE co.id = _co_id
      AND (
        public.user_in_org(_user_id, co.org_id)
        OR (co.assigned_to_org_id IS NOT NULL AND public.user_in_org(_user_id, co.assigned_to_org_id))
        OR EXISTS (
          SELECT 1
          FROM public.change_order_collaborators coc
          WHERE coc.co_id = co.id
            AND coc.status IN ('active', 'completed')
            AND public.user_in_org(_user_id, coc.organization_id)
        )
      )
  );
$$;