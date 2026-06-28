
CREATE OR REPLACE FUNCTION public.co_viewer_role(_co_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_co_org uuid;
  v_assigned uuid;
  v_project uuid;
  v_org_type text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'none';
  END IF;

  SELECT org_id, assigned_to_org_id, project_id
    INTO v_co_org, v_assigned, v_project
  FROM public.change_orders
  WHERE id = _co_id;

  IF v_co_org IS NULL THEN
    RETURN 'none';
  END IF;

  -- Prefer the viewer's org that participates in this project; fall back to any user_org_role
  SELECT lower(o.type::text)
    INTO v_org_type
  FROM public.user_org_roles uor
  JOIN public.organizations o ON o.id = uor.organization_id
  LEFT JOIN public.project_participants pp
    ON pp.organization_id = uor.organization_id
   AND pp.project_id = v_project
  WHERE uor.user_id = v_uid
  ORDER BY (pp.id IS NOT NULL) DESC,
           (uor.organization_id = v_co_org) DESC,
           (uor.organization_id = v_assigned) DESC,
           uor.created_at ASC
  LIMIT 1;

  RETURN CASE coalesce(v_org_type,'')
    WHEN 'gc' THEN 'gc'
    WHEN 'tc' THEN 'tc'
    WHEN 'fc' THEN 'fc'
    ELSE 'none'
  END;
END;
$function$;
