-- Fix is_pm_role to include FC_PM role so Field Crew PMs can accept invites

CREATE OR REPLACE FUNCTION public.is_pm_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_org_roles
        WHERE user_id = _user_id
          AND role IN ('GC_PM', 'TC_PM', 'FC_PM')
    )
$$;