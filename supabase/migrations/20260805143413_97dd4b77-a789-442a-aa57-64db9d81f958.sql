CREATE OR REPLACE FUNCTION public.auto_create_member_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_permissions (
    user_org_role_id, can_approve_invoices, can_create_work_orders,
    can_create_pos, can_manage_team, can_view_financials, can_submit_time
  )
  VALUES (
    NEW.id,
    NEW.is_admin OR NEW.role::text = 'GC_PM',
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM','FC_PM'),
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM'),
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM','FC_PM','SUPPLIER'),
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM'),
    NEW.is_admin OR NEW.role::text IN ('GC_PM','TC_PM','FC_PM','FS')
  )
  ON CONFLICT (user_org_role_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill rows that were auto-created all-off and never customized
UPDATE public.member_permissions mp
SET can_approve_invoices = uor.is_admin OR uor.role::text = 'GC_PM',
    can_create_work_orders = uor.is_admin OR uor.role::text IN ('GC_PM','TC_PM','FC_PM'),
    can_create_pos = uor.is_admin OR uor.role::text IN ('GC_PM','TC_PM'),
    can_manage_team = uor.is_admin OR uor.role::text IN ('GC_PM','TC_PM','FC_PM','SUPPLIER'),
    can_view_financials = uor.is_admin OR uor.role::text IN ('GC_PM','TC_PM'),
    can_submit_time = uor.is_admin OR uor.role::text IN ('GC_PM','TC_PM','FC_PM','FS'),
    updated_at = now()
FROM public.user_org_roles uor
WHERE mp.user_org_role_id = uor.id
  AND mp.can_approve_invoices = false
  AND mp.can_create_work_orders = false
  AND mp.can_create_pos = false
  AND mp.can_manage_team = false
  AND mp.can_view_financials = false;