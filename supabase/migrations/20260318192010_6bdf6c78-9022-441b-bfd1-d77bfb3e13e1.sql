-- Add FC collaborator workflow for change orders so TCs can involve FC on GC-originated COs.

CREATE TABLE IF NOT EXISTS public.change_order_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_id uuid NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  collaborator_type text NOT NULL DEFAULT 'FC',
  status text NOT NULL DEFAULT 'active',
  invited_by_user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  completed_by_user_id uuid NULL REFERENCES public.profiles(user_id),
  completed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT change_order_collaborators_unique UNIQUE (co_id, organization_id),
  CONSTRAINT change_order_collaborators_type_check CHECK (collaborator_type IN ('FC')),
  CONSTRAINT change_order_collaborators_status_check CHECK (status IN ('active', 'completed', 'removed'))
);

CREATE INDEX IF NOT EXISTS idx_co_collaborators_co_status
  ON public.change_order_collaborators (co_id, status);

CREATE INDEX IF NOT EXISTS idx_co_collaborators_org_status
  ON public.change_order_collaborators (organization_id, status);

ALTER TABLE public.change_order_collaborators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_change_order(_co_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    WHERE co.id = _co_id
      AND (
        public.user_in_org(_user_id, co.org_id)
        OR (co.assigned_to_org_id IS NOT NULL AND public.user_in_org(_user_id, co.assigned_to_org_id))
        OR EXISTS (
          SELECT 1
          FROM public.change_order_collaborators coc
          WHERE coc.co_id = co.id
            AND coc.status = 'active'
            AND public.user_in_org(_user_id, coc.organization_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_request_fc_change_order_input(
  _co_id uuid,
  _fc_org_id uuid,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.change_orders co
    JOIN public.organizations org ON org.id = _fc_org_id
    JOIN public.project_team pt ON pt.project_id = co.project_id AND pt.org_id = _fc_org_id
    WHERE co.id = _co_id
      AND co.created_by_role = 'GC'
      AND co.assigned_to_org_id IS NOT NULL
      AND public.user_in_org(_user_id, co.assigned_to_org_id)
      AND co.status IN ('shared', 'rejected')
      AND org.type = 'FC'
      AND _fc_org_id <> co.org_id
      AND _fc_org_id <> co.assigned_to_org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.request_fc_change_order_input(_co_id uuid, _fc_org_id uuid)
RETURNS public.change_order_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _collab public.change_order_collaborators;
  _org_name text;
  _project_id uuid;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_request_fc_change_order_input(_co_id, _fc_org_id, _actor_id) THEN
    RAISE EXCEPTION 'You do not have permission to request FC input for this change order.' USING ERRCODE = '42501';
  END IF;

  SELECT name INTO _org_name
  FROM public.organizations
  WHERE id = _fc_org_id;

  SELECT project_id INTO _project_id
  FROM public.change_orders
  WHERE id = _co_id;

  INSERT INTO public.change_order_collaborators (
    co_id,
    organization_id,
    collaborator_type,
    status,
    invited_by_user_id,
    completed_by_user_id,
    completed_at,
    updated_at
  )
  VALUES (
    _co_id,
    _fc_org_id,
    'FC',
    'active',
    _actor_id,
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (co_id, organization_id)
  DO UPDATE SET
    collaborator_type = EXCLUDED.collaborator_type,
    status = 'active',
    invited_by_user_id = EXCLUDED.invited_by_user_id,
    completed_by_user_id = NULL,
    completed_at = NULL,
    updated_at = now()
  RETURNING * INTO _collab;

  UPDATE public.change_orders
  SET fc_input_needed = true,
      updated_at = now()
  WHERE id = _co_id;

  INSERT INTO public.co_activity (
    co_id,
    project_id,
    actor_user_id,
    actor_role,
    action,
    detail,
    amount
  )
  VALUES (
    _co_id,
    _project_id,
    _actor_id,
    'TC',
    'fc_input_requested',
    COALESCE('Requested FC input from ' || _org_name, 'Requested FC input'),
    NULL
  );

  RETURN _collab;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_fc_change_order_input(_co_id uuid)
RETURNS public.change_order_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _collab public.change_order_collaborators;
  _project_id uuid;
  _remaining_active boolean;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.change_order_collaborators coc
  SET status = 'completed',
      completed_by_user_id = _actor_id,
      completed_at = now(),
      updated_at = now()
  WHERE coc.co_id = _co_id
    AND coc.status = 'active'
    AND public.user_in_org(_actor_id, coc.organization_id)
  RETURNING * INTO _collab;

  IF _collab.id IS NULL THEN
    RAISE EXCEPTION 'You do not have an active FC input request on this change order.' USING ERRCODE = '42501';
  END IF;

  SELECT project_id INTO _project_id
  FROM public.change_orders
  WHERE id = _co_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.change_order_collaborators coc
    WHERE coc.co_id = _co_id
      AND coc.status = 'active'
  ) INTO _remaining_active;

  UPDATE public.change_orders
  SET fc_input_needed = CASE WHEN _remaining_active THEN true ELSE false END,
      updated_at = now()
  WHERE id = _co_id;

  INSERT INTO public.co_activity (
    co_id,
    project_id,
    actor_user_id,
    actor_role,
    action,
    detail,
    amount
  )
  VALUES (
    _co_id,
    _project_id,
    _actor_id,
    'FC',
    'fc_input_completed',
    'Field crew marked input complete',
    NULL
  );

  RETURN _collab;
END;
$$;

DROP POLICY IF EXISTS "Users can see their own org change orders" ON public.change_orders;
CREATE POLICY "Users can access change orders they participate in"
ON public.change_orders
FOR SELECT
TO authenticated
USING (public.can_access_change_order(id));

DROP POLICY IF EXISTS "Activity readable by co participants" ON public.co_activity;
CREATE POLICY "Activity readable by co participants"
ON public.co_activity
FOR SELECT
TO authenticated
USING (public.can_access_change_order(co_id));

DROP POLICY IF EXISTS "Activity insertable by co participants" ON public.co_activity;
CREATE POLICY "Activity insertable by co participants"
ON public.co_activity
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_change_order(co_id));

DROP POLICY IF EXISTS "Line items readable by co participants" ON public.co_line_items;
CREATE POLICY "Line items readable by co participants"
ON public.co_line_items
FOR SELECT
TO authenticated
USING (public.can_access_change_order(co_id));

DROP POLICY IF EXISTS "Labor entries readable by co participants" ON public.co_labor_entries;
CREATE POLICY "Labor entries readable by co participants"
ON public.co_labor_entries
FOR SELECT
TO authenticated
USING (public.can_access_change_order(co_id));

DROP POLICY IF EXISTS "Material items readable by co participants" ON public.co_material_items;
CREATE POLICY "Material items readable by co participants"
ON public.co_material_items
FOR SELECT
TO authenticated
USING (public.can_access_change_order(co_id));

DROP POLICY IF EXISTS "Equipment items readable by co participants" ON public.co_equipment_items;
CREATE POLICY "Equipment items readable by co participants"
ON public.co_equipment_items
FOR SELECT
TO authenticated
USING (public.can_access_change_order(co_id));

CREATE POLICY "CO collaborators readable by participants"
ON public.change_order_collaborators
FOR SELECT
TO authenticated
USING (public.can_access_change_order(co_id));

GRANT EXECUTE ON FUNCTION public.can_access_change_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_request_fc_change_order_input(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_fc_change_order_input(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_fc_change_order_input(uuid) TO authenticated;