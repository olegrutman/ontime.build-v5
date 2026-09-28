CREATE OR REPLACE FUNCTION public.can_manage_project_access(_org_id uuid, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles r
    LEFT JOIN public.member_permissions mp ON mp.user_org_role_id = r.id
    WHERE r.user_id = _user_id AND r.organization_id = _org_id
      AND (r.is_admin OR (COALESCE(mp.can_manage_team, false) AND r.project_scope = 'org'))
  );
$function$;