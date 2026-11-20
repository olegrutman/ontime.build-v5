CREATE OR REPLACE FUNCTION public.return_crew_change_order_for_fix(_co_id uuid, _note text)
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
  IF NULLIF(btrim(COALESCE(_note, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Explain what the crew needs to fix';
  END IF;

  SELECT * INTO c FROM public.change_orders WHERE id = _co_id FOR UPDATE;
  IF c.id IS NULL OR NOT public.can_see_project(c.project_id) THEN
    RAISE EXCEPTION 'Change order not found' USING ERRCODE = '42501';
  END IF;
  IF c.created_by_role <> 'FC' OR c.status <> 'submitted'
    OR c.assigned_to_org_id IS NULL
    OR NOT public.user_in_org(auth.uid(), c.assigned_to_org_id) THEN
    RAISE EXCEPTION 'Only the assigned subcontractor can return this crew order' USING ERRCODE = '42501';
  END IF;

  UPDATE public.change_orders
  SET status = 'rejected',
      rejected_at = now(),
      rejection_note = btrim(_note),
      updated_at = now()
  WHERE id = c.id;

  UPDATE public.co_line_items
  SET approval_status = 'pending',
      approval_rejection_reason = NULL,
      approval_decided_by = NULL,
      approval_decided_at = NULL
  WHERE co_id = c.id;
END;
$$;

REVOKE ALL ON FUNCTION public.return_crew_change_order_for_fix(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.return_crew_change_order_for_fix(uuid, text) TO authenticated;