-- 1. Track the company that originally created the CO/WO
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS originating_org_id uuid REFERENCES public.organizations(id);

-- Backfill: prefer the creating user's organization, else current owner
UPDATE public.change_orders co
SET originating_org_id = COALESCE(
  (SELECT uor.organization_id
     FROM public.user_org_roles uor
    WHERE uor.user_id = co.created_by_user_id
    ORDER BY uor.created_at
    LIMIT 1),
  co.org_id
)
WHERE co.originating_org_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_change_orders_originating_org
  ON public.change_orders (originating_org_id);

-- 2. Access: originating org keeps visibility forever
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
        OR (co.originating_org_id IS NOT NULL AND public.user_in_org(_user_id, co.originating_org_id))
        OR EXISTS (
          SELECT 1
          FROM public.change_order_collaborators coc
          WHERE coc.co_id = co.id
            AND coc.status IN ('active', 'completed')
            AND public.user_in_org(_user_id, coc.organization_id)
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Users can select owned or assigned change orders (direct)" ON public.change_orders;
CREATE POLICY "Users can select owned or assigned change orders (direct)"
ON public.change_orders FOR SELECT
TO authenticated
USING (
  (
    public.user_in_org(auth.uid(), org_id)
    OR (assigned_to_org_id IS NOT NULL AND public.user_in_org(auth.uid(), assigned_to_org_id))
    OR (originating_org_id IS NOT NULL AND public.user_in_org(auth.uid(), originating_org_id))
  )
  AND public.can_see_project(project_id)
);

-- 3. Forwarding keeps the originating company linked
CREATE OR REPLACE FUNCTION public.forward_change_order_to_upstream_gc(_co_id uuid)
RETURNS public.change_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_co public.change_orders;
  upstream_gc_org_id uuid;
  origin_org_id uuid;
BEGIN
  SELECT * INTO current_co FROM public.change_orders WHERE id = _co_id;

  IF current_co.id IS NULL THEN
    RAISE EXCEPTION 'Change order not found';
  END IF;

  IF current_co.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted change orders can be forwarded';
  END IF;

  IF current_co.created_by_role <> 'FC' THEN
    RAISE EXCEPTION 'Only FC-originated change orders can be forwarded upstream';
  END IF;

  IF current_co.assigned_to_org_id IS NULL OR NOT public.user_in_org(auth.uid(), current_co.assigned_to_org_id) THEN
    RAISE EXCEPTION 'You are not authorized to forward this change order';
  END IF;

  SELECT pc.to_org_id
  INTO upstream_gc_org_id
  FROM public.project_contracts pc
  WHERE pc.project_id = current_co.project_id
    AND pc.from_org_id = current_co.assigned_to_org_id
    AND pc.to_role = 'General Contractor'
    AND pc.to_org_id IS NOT NULL
  ORDER BY pc.created_at DESC
  LIMIT 1;

  IF upstream_gc_org_id IS NULL THEN
    RAISE EXCEPTION 'No upstream GC organization found for this project';
  END IF;

  origin_org_id := COALESCE(current_co.originating_org_id, current_co.org_id);

  UPDATE public.change_orders
  SET org_id = current_co.assigned_to_org_id,
      assigned_to_org_id = upstream_gc_org_id,
      originating_org_id = origin_org_id,
      updated_at = now()
  WHERE id = _co_id
  RETURNING * INTO current_co;

  IF origin_org_id IS DISTINCT FROM current_co.org_id THEN
    INSERT INTO public.change_order_collaborators (co_id, organization_id, collaborator_type, status, completed_at)
    VALUES (_co_id, origin_org_id, 'FC', 'completed', now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN current_co;
END;
$$;

-- 4. Repair already-forwarded items: link the originating crew as a completed collaborator
INSERT INTO public.change_order_collaborators (co_id, organization_id, collaborator_type, status, completed_at)
SELECT co.id, co.originating_org_id, 'FC', 'completed', now()
FROM public.change_orders co
WHERE co.created_by_role = 'FC'
  AND co.originating_org_id IS NOT NULL
  AND co.originating_org_id <> co.org_id
  AND NOT EXISTS (
    SELECT 1 FROM public.change_order_collaborators coc
    WHERE coc.co_id = co.id AND coc.organization_id = co.originating_org_id
  );