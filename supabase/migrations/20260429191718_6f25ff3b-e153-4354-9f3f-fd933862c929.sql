-- 1. CO grand-total helper (matches client-side useChangeOrderDetail logic)
CREATE OR REPLACE FUNCTION public.co_grand_total(_co_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH co AS (
    SELECT use_fc_pricing_base, tc_submitted_price FROM public.change_orders WHERE id = _co_id
  ),
  labor AS (
    SELECT
      COALESCE(SUM(CASE WHEN entered_by_role = 'TC' AND NOT is_actual_cost THEN line_total ELSE 0 END), 0) AS tc_labor
    FROM public.co_labor_entries WHERE co_id = _co_id
  ),
  mats AS (
    SELECT COALESCE(SUM(billed_amount), 0) AS total FROM public.co_material_items WHERE co_id = _co_id
  ),
  eq AS (
    SELECT COALESCE(SUM(billed_amount), 0) AS total FROM public.co_equipment_items WHERE co_id = _co_id
  )
  SELECT
    CASE
      WHEN co.use_fc_pricing_base AND COALESCE(co.tc_submitted_price, 0) > 0
        THEN co.tc_submitted_price
      ELSE labor.tc_labor
    END
    + mats.total + eq.total
  FROM co, labor, mats, eq;
$$;

-- 2. Find the project_contracts row between two orgs on a project (any direction)
CREATE OR REPLACE FUNCTION public._co_target_contract_id(_project_id uuid, _org_a uuid, _org_b uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.project_contracts
  WHERE project_id = _project_id
    AND (
      (from_org_id = _org_a AND to_org_id = _org_b)
      OR (from_org_id = _org_b AND to_org_id = _org_a)
    )
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- 3. Idempotent contract delta on CO status transitions
CREATE OR REPLACE FUNCTION public.apply_co_contract_delta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_old_amt numeric := 0;
  v_new_amt numeric := 0;
  v_was_applied boolean;
  v_is_applied boolean;
BEGIN
  -- "applied" means status='approved' and approved_at is set
  v_was_applied := (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND OLD.approved_at IS NOT NULL);
  v_is_applied  := (NEW.status = 'approved' AND NEW.approved_at IS NOT NULL);

  IF NEW.org_id IS NULL OR NEW.assigned_to_org_id IS NULL OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_contract_id := public._co_target_contract_id(NEW.project_id, NEW.org_id, NEW.assigned_to_org_id);
  IF v_contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_was_applied THEN v_old_amt := public.co_grand_total(NEW.id); END IF;
  IF v_is_applied  THEN v_new_amt := public.co_grand_total(NEW.id); END IF;

  IF v_old_amt <> v_new_amt THEN
    UPDATE public.project_contracts
       SET contract_sum = COALESCE(contract_sum, 0) + (v_new_amt - v_old_amt),
           updated_at = now()
     WHERE id = v_contract_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_co_contract_delta ON public.change_orders;
CREATE TRIGGER trg_apply_co_contract_delta
AFTER UPDATE OF status, approved_at ON public.change_orders
FOR EACH ROW
EXECUTE FUNCTION public.apply_co_contract_delta();

-- 4. Mark tc_submitted_price intent via comment (rename deferred — too many call sites; semantics now enforced by trigger #3 which freezes amount at approval)
COMMENT ON COLUMN public.change_orders.tc_submitted_price IS
  'Snapshot price the TC submitted to the GC. Should only be written at submission or while FC-pricing toggle is enabled. Contract impact is computed via apply_co_contract_delta.';
