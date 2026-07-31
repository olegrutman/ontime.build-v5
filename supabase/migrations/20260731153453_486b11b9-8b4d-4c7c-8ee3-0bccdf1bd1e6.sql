CREATE OR REPLACE FUNCTION public.guard_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_remaining integer;
BEGIN
  -- A user deletion invokes this trigger through the auth.users foreign-key
  -- cascade at nested trigger depth. Allow that account-cleanup path.
  -- Direct role deletion remains depth 1 and is still protected below.
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  SELECT count(*)
    INTO v_remaining
    FROM public.user_org_roles
   WHERE organization_id = COALESCE(OLD.organization_id, NEW.organization_id)
     AND is_admin = true
     AND id <> OLD.id;

  IF v_remaining = 0 THEN
    RAISE EXCEPTION 'Cannot remove or demote the last admin of this organization. Promote another admin first.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;