CREATE OR REPLACE FUNCTION public.list_project_co_scopes(_project_id uuid)
RETURNS TABLE (id uuid, co_number text, title text, document_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT co.id, co.co_number, co.title, co.document_type::text
  FROM public.change_orders co
  WHERE co.project_id = _project_id
    AND EXISTS (
      SELECT 1
      FROM public.project_participants pp
      WHERE pp.project_id = _project_id
        AND pp.invite_status = 'ACCEPTED'
        AND public.user_in_org(auth.uid(), pp.organization_id)
    )
  ORDER BY co.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_project_co_scopes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_project_co_scopes(uuid) TO authenticated;