CREATE OR REPLACE FUNCTION public.can_approve_upstream_po(_po_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    JOIN public.project_participants pp ON pp.project_id = po.project_id
    JOIN public.organizations o ON o.id = pp.organization_id
    WHERE po.id = _po_id
      AND po.project_id IS NOT NULL
      AND pp.invite_status = 'ACCEPTED'
      AND o.type = 'GC'::org_type
      AND public.user_in_org(_user_id, pp.organization_id)
      AND public.is_pm_role(_user_id)
  )
$$;

REVOKE ALL ON FUNCTION public.can_approve_upstream_po(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_approve_upstream_po(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "GC approver can act on pending POs" ON public.purchase_orders;
CREATE POLICY "GC approver can act on pending POs"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (status = 'PENDING_APPROVAL'::po_status AND public.can_approve_upstream_po(id, auth.uid()))
WITH CHECK (public.can_approve_upstream_po(id, auth.uid()));