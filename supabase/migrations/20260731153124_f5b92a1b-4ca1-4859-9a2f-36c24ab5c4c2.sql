CREATE OR REPLACE FUNCTION public.guard_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_remaining int;
begin
  -- Skip the guard when the underlying account is gone (account deletion cascade)
  if TG_OP = 'DELETE' and not exists (select 1 from auth.users u where u.id = old.user_id) then
    return old;
  end if;

  select count(*) into v_remaining from user_org_roles
  where organization_id = coalesce(old.organization_id, new.organization_id)
    and is_admin = true and id <> old.id;
  if v_remaining = 0 then
    raise exception 'Cannot remove or demote the last admin of this organization. Promote another admin first.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end; $function$;