
-- =============================================================
-- FIX #4: Expand assigned org UPDATE policy to include 'approved' (for TC markCompleted)
-- and allow recall from 'submitted'
-- =============================================================
DROP POLICY IF EXISTS "Assigned org can work active change orders" ON public.change_orders;
CREATE POLICY "Assigned org can work active change orders" ON public.change_orders
  FOR UPDATE TO authenticated
  USING (
    assigned_to_org_id IS NOT NULL
    AND user_in_org(auth.uid(), assigned_to_org_id)
    AND status IN ('shared','rejected','combined','work_in_progress','closed_for_pricing','submitted','approved')
  )
  WITH CHECK (
    assigned_to_org_id IS NOT NULL
    AND user_in_org(auth.uid(), assigned_to_org_id)
    AND status IN ('shared','submitted','rejected','combined','work_in_progress','closed_for_pricing','approved','draft')
  );

-- =============================================================
-- FIX #1: Internal costs (is_actual_cost=true) only visible to owning org
-- =============================================================
CREATE OR REPLACE FUNCTION public.can_see_co_labor_entry(
  _co_id uuid,
  _entry_org_id uuid,
  _is_actual_cost boolean,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_access_change_order(_co_id, _user_id)
    AND (
      NOT _is_actual_cost
      OR public.user_in_org(_user_id, _entry_org_id)
    );
$$;

DROP POLICY IF EXISTS "Labor entries readable by co participants" ON public.co_labor_entries;
CREATE POLICY "Labor entries readable by co participants"
ON public.co_labor_entries
FOR SELECT
TO authenticated
USING (public.can_see_co_labor_entry(co_id, org_id, is_actual_cost));

-- =============================================================
-- FIX #10: NTE cap enforcement trigger (server-side)
-- =============================================================
CREATE OR REPLACE FUNCTION public.enforce_nte_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _co RECORD;
  _current_total numeric;
BEGIN
  -- Only enforce on billable entries
  IF NEW.is_actual_cost THEN
    RETURN NEW;
  END IF;

  SELECT pricing_type, nte_cap
  INTO _co
  FROM public.change_orders
  WHERE id = NEW.co_id;

  -- Only enforce for NTE COs with a cap set
  IF _co.pricing_type <> 'nte' OR _co.nte_cap IS NULL OR _co.nte_cap <= 0 THEN
    RETURN NEW;
  END IF;

  -- Sum existing billable labor (exclude actual costs)
  SELECT COALESCE(SUM(line_total), 0)
  INTO _current_total
  FROM public.co_labor_entries
  WHERE co_id = NEW.co_id
    AND NOT is_actual_cost
    AND id <> NEW.id;  -- exclude self for UPDATE case

  IF _current_total + NEW.line_total > _co.nte_cap THEN
    RAISE EXCEPTION 'NTE cap reached (%.2f / %.2f). Request a cap increase before adding more.', 
      _current_total + NEW.line_total, _co.nte_cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_nte_cap ON public.co_labor_entries;
CREATE TRIGGER trg_enforce_nte_cap
  BEFORE INSERT OR UPDATE ON public.co_labor_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_nte_cap();
