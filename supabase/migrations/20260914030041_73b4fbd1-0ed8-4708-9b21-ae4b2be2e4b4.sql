CREATE OR REPLACE FUNCTION public.enforce_single_org_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_user_id uuid;
BEGIN
  IF NEW.is_admin IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT created_by INTO _owner_user_id
  FROM organizations WHERE id = NEW.organization_id;

  -- Demote any other admin in this org, except the organization owner
  UPDATE user_org_roles
  SET is_admin = false
  WHERE organization_id = NEW.organization_id
    AND id <> NEW.id
    AND is_admin = true
    AND (_owner_user_id IS NULL OR user_id <> _owner_user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_org_admin_trg ON public.user_org_roles;
CREATE TRIGGER enforce_single_org_admin_trg
AFTER INSERT OR UPDATE OF is_admin ON public.user_org_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_org_admin();