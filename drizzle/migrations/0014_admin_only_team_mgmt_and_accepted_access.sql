CREATE OR REPLACE FUNCTION public.can_see_project(p_project_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_ok boolean;
BEGIN
  IF auth.uid() IS NULL OR p_project_id IS NULL THEN RETURN false; END IF;
  SELECT EXISTS (
    SELECT 1 FROM projects p JOIN user_org_roles r ON r.user_id = auth.uid()
    WHERE p.id = p_project_id
      AND (r.organization_id = p.organization_id
           OR EXISTS (SELECT 1 FROM project_participants pp WHERE pp.project_id = p.id
                      AND pp.organization_id = r.organization_id AND pp.invite_status = 'ACCEPTED'))
      AND (r.is_admin OR r.project_scope = 'org')
  ) INTO v_ok;
  IF v_ok THEN RETURN true; END IF;
  SELECT EXISTS (
    SELECT 1 FROM project_members m JOIN projects p ON p.id = m.project_id
    WHERE m.project_id = p_project_id AND m.user_id = auth.uid() AND m.status = 'active'
      AND (m.organization_id = p.organization_id
           OR EXISTS (SELECT 1 FROM project_participants pp WHERE pp.project_id = p.id
                      AND pp.organization_id = m.organization_id AND pp.invite_status = 'ACCEPTED'))
  ) INTO v_ok;
  RETURN coalesce(v_ok, false);
END; $$;

CREATE OR REPLACE FUNCTION public.can_manage_project_access(_org_id uuid, _user_id uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $f$
  SELECT EXISTS (SELECT 1 FROM public.user_org_roles r
    WHERE r.user_id = _user_id AND r.organization_id = _org_id AND r.is_admin);
$f$;

CREATE OR REPLACE FUNCTION public.auto_create_member_permissions()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  INSERT INTO public.member_permissions (
    user_org_role_id, can_approve_invoices, can_create_work_orders,
    can_create_pos, can_manage_team, can_view_financials, can_submit_time)
  VALUES (NEW.id,
    NEW.is_admin OR NEW.role::text = 'GC_PM',
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM','FC_PM'),
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM'),
    NEW.is_admin,
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM'),
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM','FC_PM','FS'))
  ON CONFLICT (user_org_role_id) DO NOTHING;
  RETURN NEW;
END; $f$;

CREATE POLICY "Invited company admins can view invited project basics" ON public.projects
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.project_participants pp JOIN public.user_org_roles r
    ON r.organization_id = pp.organization_id AND r.user_id = auth.uid() AND r.is_admin
  WHERE pp.project_id = projects.id AND pp.invite_status = 'INVITED'));