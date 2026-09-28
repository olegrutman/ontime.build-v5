DROP TRIGGER IF EXISTS enforce_single_org_admin_trg ON public.user_org_roles;
COMMENT ON FUNCTION public.enforce_single_org_admin() IS 'DEPRECATED: companies may have several admins; trigger removed';