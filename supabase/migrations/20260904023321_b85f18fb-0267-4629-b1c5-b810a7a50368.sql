CREATE OR REPLACE FUNCTION public.notify_estimate_decision(_estimate_id uuid, _approved boolean, _reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _est record;
  _count integer := 0;
BEGIN
  SELECT e.id, e.project_id, e.supplier_org_id, e.total_amount, p.name AS project_name
    INTO _est
  FROM public.supplier_estimates e
  JOIN public.projects p ON p.id = e.project_id
  WHERE e.id = _estimate_id;

  IF _est.id IS NULL THEN
    RETURN 0;
  END IF;

  -- Only participants on the project may trigger this notification
  IF NOT public.has_project_access(auth.uid(), _est.project_id) THEN
    RAISE EXCEPTION 'Not authorized for this project';
  END IF;

  INSERT INTO public.notifications (
    recipient_org_id, recipient_user_id, type, title, body,
    entity_type, entity_id, action_url, is_read
  )
  SELECT
    _est.supplier_org_id,
    uor.user_id,
    CASE WHEN _approved THEN 'CHANGE_APPROVED'::notification_type ELSE 'CHANGE_REJECTED'::notification_type END,
    CASE WHEN _approved THEN 'Estimate approved' ELSE 'Estimate rejected' END,
    CASE WHEN _approved
      THEN 'Your estimate for ' || COALESCE(_est.project_name, 'the project') || ' was approved'
           || COALESCE(' — $' || to_char(_est.total_amount, 'FM999,999,999.00'), '')
      ELSE 'Your estimate for ' || COALESCE(_est.project_name, 'the project') || ' was rejected'
           || COALESCE(': ' || NULLIF(_reason, ''), '')
    END,
    'supplier_estimate',
    _est.id,
    '/supplier/estimates',
    false
  FROM public.user_org_roles uor
  WHERE uor.org_id = _est.supplier_org_id;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_estimate_decision(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_estimate_decision(uuid, boolean, text) TO authenticated;