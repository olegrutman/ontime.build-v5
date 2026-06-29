CREATE OR REPLACE FUNCTION public.can_delete_change_order(_co_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    LEFT JOIN public.user_org_roles uor
      ON uor.user_id = _user_id
     AND uor.organization_id = co.org_id
    LEFT JOIN public.member_permissions mp
      ON mp.user_org_role_id = uor.id
    WHERE co.id = _co_id
      AND co.status IN ('draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'rejected')
      AND (
        public.is_platform_staff(_user_id)
        OR co.created_by_user_id = _user_id
        OR uor.id IS NOT NULL
      )
      AND (
        public.is_platform_staff(_user_id)
        OR co.created_by_user_id = _user_id
        OR COALESCE(uor.is_admin, false)
        OR COALESCE(
          mp.can_create_work_orders,
          CASE uor.role
            WHEN 'GC_PM' THEN true
            WHEN 'TC_PM' THEN true
            WHEN 'FC_PM' THEN true
            ELSE false
          END,
          false
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_delete_change_order(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_delete_change_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_change_order(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS "CO deletable by creator or owner org (non-final states)" ON public.change_orders;
DROP POLICY IF EXISTS "CO deletable by authorized owner org in editable states" ON public.change_orders;

CREATE POLICY "CO deletable by authorized owner org in editable states"
ON public.change_orders
FOR DELETE
TO authenticated
USING (public.can_delete_change_order(id, auth.uid()));