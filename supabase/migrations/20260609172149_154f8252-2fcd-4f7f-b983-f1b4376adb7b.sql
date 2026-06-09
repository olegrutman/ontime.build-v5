CREATE OR REPLACE FUNCTION public.reset_project_setup(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.project_participants pp
    JOIN public.user_org_roles uor ON uor.organization_id = pp.organization_id
    JOIN public.organizations o ON o.id = pp.organization_id
    WHERE pp.project_id = p_project_id
      AND uor.user_id = v_uid
      AND pp.status = 'ACCEPTED'
      AND o.organization_type IN ('GENERAL_CONTRACTOR','TRADE_CONTRACTOR')
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Not authorized to reset setup for this project';
  END IF;

  DELETE FROM public.project_setup_answers WHERE project_id = p_project_id;
  UPDATE public.projects
     SET setup_completion_required = true,
         updated_at = now()
   WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_project_setup(uuid) TO authenticated;