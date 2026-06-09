CREATE OR REPLACE FUNCTION public.complete_project_adoption(
  p_project_id uuid,
  p_owner_org_id uuid,
  p_contract_mode text,
  p_project_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Caller must be an accepted participant of the project, in the org taking over.
  SELECT pp.role INTO v_role
  FROM public.project_participants pp
  WHERE pp.project_id = p_project_id
    AND pp.user_id = auth.uid()
    AND pp.organization_id = p_owner_org_id
    AND pp.invite_status = 'ACCEPTED'
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('GC','TC') THEN
    RAISE EXCEPTION 'Not authorized to complete setup for this project';
  END IF;

  UPDATE public.projects
  SET setup_completion_required = false,
      contract_mode = COALESCE(p_contract_mode, contract_mode),
      project_type  = COALESCE(NULLIF(p_project_type, ''), project_type),
      organization_id = p_owner_org_id
  WHERE id = p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_project_adoption(uuid, uuid, text, text) TO authenticated;