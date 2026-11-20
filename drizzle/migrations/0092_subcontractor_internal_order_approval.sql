CREATE OR REPLACE FUNCTION public.set_own_change_order_internal(_co_id uuid, _internal boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.change_orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.id IS NULL OR NOT public.can_see_project(c.project_id) THEN
    RAISE EXCEPTION 'Change order not found' USING ERRCODE = '42501';
  END IF;
  IF c.created_by_role <> 'TC' THEN
    RAISE EXCEPTION 'Only subcontractor-owned orders can use internal self-approval';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_org_roles u
    JOIN public.organizations o ON o.id = u.organization_id AND o.type = 'TC'
    LEFT JOIN public.member_permissions p ON p.user_org_role_id = u.id
    WHERE u.user_id = auth.uid()
      AND u.organization_id = c.org_id
      AND (u.is_admin OR COALESCE(p.can_approve_invoices, false))
  ) THEN
    RAISE EXCEPTION 'Only an authorized member of the owning subcontractor can approve this order' USING ERRCODE = '42501';
  END IF;

  IF _internal THEN
    IF c.status NOT IN ('draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted') THEN
      RAISE EXCEPTION 'This order can no longer be approved internally';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.co_line_items li WHERE li.co_id = c.id) THEN
      RAISE EXCEPTION 'Add at least one scope item before approving';
    END IF;

    UPDATE public.change_orders
    SET kept_internal = true,
        status = CASE WHEN status = 'submitted' THEN 'draft' ELSE status END,
        submitted_at = CASE WHEN status = 'submitted' THEN NULL ELSE submitted_at END,
        rejected_at = NULL,
        rejection_note = NULL,
        updated_at = now()
    WHERE id = c.id;
  ELSE
    IF NOT c.kept_internal OR c.status NOT IN ('draft', 'shared', 'work_in_progress', 'closed_for_pricing') THEN
      RAISE EXCEPTION 'Only a pre-submission internal order can be reopened';
    END IF;

    UPDATE public.change_orders
    SET kept_internal = false,
        updated_at = now()
    WHERE id = c.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_change_order_internal(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_own_change_order_internal(uuid, boolean) TO authenticated;