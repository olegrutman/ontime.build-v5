CREATE OR REPLACE FUNCTION public.search_existing_team_targets(_query text, _project_id uuid, _limit integer DEFAULT 10)
RETURNS TABLE(result_type text, org_id uuid, org_name text, org_type text, org_trade text, contact_user_id uuid, contact_name text, contact_email text, city_state text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_project_participant(auth.uid(), _project_id) OR NOT public.can_see_project(_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF LENGTH(TRIM(COALESCE(_query, ''))) < 2 THEN RETURN; END IF;

  RETURN QUERY
  SELECT DISTINCT 'organization'::text, d.org_id, d.org_name, d.org_type, d.org_trade,
    d.contact_user_id, d.contact_name, d.contact_email, d.city_state
  FROM public.connected_team_target_directory d
  WHERE (
      d.org_name ILIKE '%' || _query || '%'
      OR d.contact_name ILIKE '%' || _query || '%'
      OR d.contact_email ILIKE '%' || _query || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.project_team pt
      WHERE pt.project_id = _project_id AND pt.org_id = d.org_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.project_invites pi
      WHERE pi.project_id = _project_id AND pi.status = 'Invited'
        AND d.contact_email IS NOT NULL AND lower(pi.invited_email) = lower(d.contact_email)
    )
  ORDER BY d.org_name
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 10), 25));
END;
$function$;